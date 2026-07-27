import logging
import os
import quopri
from datetime import timedelta
from urllib.parse import parse_qs, quote, unquote, urlparse

from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core import signing
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .models import Challenge, CoachInvite, GameSession, JournalEntry, PushSubscription, Task, User, UserTask, XPLog
from .serializers import (
    AssignDailyTasksInputSerializer,
    CompleteTaskInputSerializer,
    CreateCustomTaskInputSerializer,
    DailyTasksQuerySerializer,
    EquipBadgeInputSerializer,
    FocusPoolQuerySerializer,
    GameStartInputSerializer,
    GameSubmitInputSerializer,
    GameXPInputSerializer,
    JournalEntryInputSerializer,
    JournalEntrySerializer,
    LeaderboardQuerySerializer,
    ForgotPasswordInputSerializer,
    PushSubscriptionSerializer,
    RegisterInputSerializer,
    ResetPasswordInputSerializer,
    UpdateFocusCategoryInputSerializer,
    UpdateNameInputSerializer,
    UserSerializer,
    UserTaskSerializer,
    CoachInviteSerializer,
    ClientRosterSerializer,
    ClientDetailSerializer,
    CoachNoteInputSerializer,
    CreateClientTaskInputSerializer,
    ClientTaskHistoryQuerySerializer,
)
from .services import (
    award_shield_for_perfect_week,
    assign_daily_tasks,
    calculate_game_session_xp_for_type,
    check_and_award_daily_challenge,
    check_streak_on_login,
    create_xp_log,
    get_today_completed_task_count,
    get_daily_challenge_status,
    get_daily_game_xp_cap,
    get_daily_game_remaining_by_type,
    get_or_create_daily_task_set,
    get_daily_tasks,
    CUSTOM_TASK_PREFIX,
    get_game_session,
    get_leaderboard,
    get_prestige_leaderboard,
    get_user_stats,
    grant_streak_shields,
    get_user_task,
    get_today_game_xp,
    increment_user_xp,
    seed_task_templates,
    TASK_XP_AMOUNT,
    XP_ELIGIBLE_TASK_COUNT,
    get_weekly_war_report,
    transfer_xp_wager,
    update_streak,
    validate_game_duration,
    validate_game_score,
)


JOURNAL_DAILY_XP = 20
PASSWORD_RESET_SIGNING_SALT = "api.password-reset"
CHALLENGE_EXPIRY_HOURS = 48
CHALLENGE_GAME_TYPES = [
    "quick_math",
    "focus_tap",
    "number_recall",
    "color_count_focus",
    "speed_pattern",
    "reverse_order",
    "number_stack",
    "pattern_sequence",
    "logic_grid",
    "reaction_tap",
]
CHALLENGE_SCORE_BASED_GAME_TYPES = {"quick_math"}
CHALLENGE_TIME_BASED_GAME_TYPES = {
    "focus_tap",
    "pattern_sequence",
    "logic_grid",
    "reaction_tap",
}
CHALLENGE_ROUNDS_BASED_GAME_TYPES = {
    "number_recall",
    "speed_pattern",
    "number_stack",
    "reverse_order",
    "color_count_focus",
}
GAME_TYPE_LABELS = {
    "quick_math": "Quick Math",
    "focus_tap": "Focus Tap",
    "number_recall": "Number Recall",
    "color_count_focus": "Color Count Focus",
    "speed_pattern": "Speed Pattern",
    "reverse_order": "Reverse Order",
    "number_stack": "Number Stack",
    "pattern_sequence": "Pattern Sequence",
    "logic_grid": "Logic Grid",
    "reaction_tap": "Reaction Tap",
}
logger = logging.getLogger(__name__)


class ChallengeCreateSerializer(serializers.Serializer):
    game_type = serializers.ChoiceField(choices=CHALLENGE_GAME_TYPES)
    challenger_score = serializers.IntegerField(min_value=0)
    challenger_metric = serializers.FloatField(min_value=0, required=False, allow_null=True)
    xp_wager = serializers.IntegerField(min_value=0, max_value=200, default=0)
    seed = serializers.DictField(required=False, default=dict)

    def validate(self, attrs):
        game_type = attrs.get("game_type")
        metric = attrs.get("challenger_metric")
        if game_type not in CHALLENGE_SCORE_BASED_GAME_TYPES and metric is None:
            raise serializers.ValidationError("challenger_metric is required for this game type.")
        return attrs


class ChallengeAcceptSerializer(serializers.Serializer):
    opponent_score = serializers.IntegerField(min_value=0)
    opponent_metric = serializers.FloatField(min_value=0, required=False, allow_null=True)


def resolve_challenge_winner(game_type, challenger_score, opponent_score, challenger_metric=None, opponent_metric=None):
    """
    Determine who wins the challenge.

    Score-based (quick_math): higher score wins.
    Time-based (focus_tap, pattern_sequence, logic_grid, reaction_tap): lower metric wins (faster).
    Rounds-based (number_recall, speed_pattern, number_stack, reverse_order, color_count): lower metric wins (fewer rounds).
    """
    if game_type in CHALLENGE_SCORE_BASED_GAME_TYPES:
        if opponent_score > challenger_score:
            return Challenge.WINNER_OPPONENT
        if opponent_score < challenger_score:
            return Challenge.WINNER_CHALLENGER
        return Challenge.WINNER_TIE

    # For all metric-based games: lower value is better (less time or fewer rounds)
    if game_type in CHALLENGE_TIME_BASED_GAME_TYPES or game_type in CHALLENGE_ROUNDS_BASED_GAME_TYPES:
        if challenger_metric is None or opponent_metric is None:
            # If metric is missing, fall back to score comparison
            if opponent_score >= 1 and challenger_score >= 1:
                return Challenge.WINNER_TIE
            return Challenge.WINNER_OPPONENT if opponent_score >= 1 else Challenge.WINNER_CHALLENGER

        if opponent_metric < challenger_metric:
            return Challenge.WINNER_OPPONENT
        if opponent_metric > challenger_metric:
            return Challenge.WINNER_CHALLENGER
        return Challenge.WINNER_TIE

    # Generic fallback: opponent wins by completing (score >= 1)
    return Challenge.WINNER_OPPONENT if opponent_score >= 1 else Challenge.WINNER_CHALLENGER


def serialize_challenge(challenge, request_user=None):
    challenger = challenge.challenger
    opponent = challenge.opponent
    is_challenger = bool(request_user and request_user.id == challenger.id)
    is_opponent = bool(request_user and opponent and request_user.id == opponent.id)

    now = timezone.now()
    is_expired = challenge.expires_at < now and challenge.status == Challenge.STATUS_OPEN

    result = {
        "id": str(challenge.id),
        "game_type": challenge.game_type,
        "game_type_label": GAME_TYPE_LABELS.get(challenge.game_type, challenge.game_type),
        "challenger": {
            "id": str(challenger.id),
            "name": challenger.name or challenger.username,
            "level": challenger.level,
            "streak": challenger.streak,
        },
        "challenger_score": challenge.challenger_score,
        "challenger_metric": challenge.challenger_metric,
        "xp_wager": challenge.challenger_xp_wager,
        "seed": challenge.seed,
        "status": Challenge.STATUS_EXPIRED if is_expired else challenge.status,
        "opponent_score": challenge.opponent_score,
        "opponent_metric": challenge.opponent_metric,
        "winner": challenge.winner,
        "created_at": challenge.created_at.isoformat(),
        "expires_at": challenge.expires_at.isoformat(),
        "completed_at": challenge.completed_at.isoformat() if challenge.completed_at else None,
        "is_challenger": is_challenger,
        "is_opponent": is_opponent,
        "hours_remaining": max(0, int((challenge.expires_at - now).total_seconds() / 3600)),
    }

    if opponent:
        result["opponent"] = {
            "id": str(opponent.id),
            "name": opponent.name or opponent.username,
            "level": opponent.level,
            "streak": opponent.streak,
        }

    return result


def get_validation_error_message(exc, fallback="Request failed."):
    detail = getattr(exc, "detail", None)

    if isinstance(detail, list) and detail:
        return str(detail[0])

    if isinstance(detail, dict) and detail:
        first_value = next(iter(detail.values()))
        if isinstance(first_value, list) and first_value:
            return str(first_value[0])
        return str(first_value)

    if detail:
        return str(detail)

    return str(exc) if str(exc) else fallback


def decode_quoted_printable_value(value):
    if not value:
        return ""

    try:
        return quopri.decodestring(value.encode("utf-8")).decode("utf-8")
    except Exception:
        return value


def normalize_reset_token(raw_token):
    if not raw_token:
        return ""

    token = str(raw_token).strip().strip('"').strip("'")
    token = token.replace("\r", "").replace("\n", "")
    if not token:
        return ""

    token = decode_quoted_printable_value(token).strip()

    try:
        parsed = urlparse(token)
        if parsed.scheme and parsed.netloc:
            query_token = parse_qs(parsed.query).get("reset_token", [""])[0]
            if query_token:
                token = query_token.strip()
    except Exception:
        pass

    if "reset_token=" in token:
        query_part = token.split("?", 1)[-1]
        query_token = parse_qs(query_part).get("reset_token", [""])[0]
        if query_token:
            token = query_token.strip()

    token = decode_quoted_printable_value(token).strip()

    if token.startswith("3Dey"):
        token = token[2:]
    if token.startswith("=3D"):
        token = token[3:]
    if token.startswith("="):
        token = token[1:]

    return token.strip().strip('"').strip("'")


def load_reset_payload(token):
    clean_token = normalize_reset_token(token)
    candidates = []

    def add_candidate(value):
        if value and value not in candidates:
            candidates.append(value)

    add_candidate(clean_token)
    add_candidate(unquote(clean_token))
    add_candidate(decode_quoted_printable_value(clean_token))
    add_candidate(clean_token.replace(" ", "+"))

    for candidate in list(candidates):
        normalized = normalize_reset_token(candidate)
        add_candidate(normalized)
        add_candidate(unquote(normalized))
        add_candidate(decode_quoted_printable_value(normalized))
        add_candidate(normalized.replace(" ", "+"))
        if normalized.startswith("3D"):
            add_candidate(normalized[2:])
        if normalized.startswith("=3D"):
            add_candidate(normalized[3:])
        if normalized.startswith("="):
            add_candidate(normalized[1:])

    for candidate in candidates:
        if not candidate:
            continue
        try:
            payload = signing.loads(
                candidate,
                salt=PASSWORD_RESET_SIGNING_SALT,
                max_age=getattr(settings, "PASSWORD_RESET_TOKEN_MAX_AGE_SECONDS", 3600),
            )
            return payload
        except signing.SignatureExpired:
            raise
        except signing.BadSignature:
            continue

    raise signing.BadSignature("Invalid token.")


class HelloView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(
            {
                "message": "Backend is live.",
                "stack": "Django + DRF + JWT",
            }
        )


class RegisterView(APIView):
    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request):
        serializer = RegisterInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        name = serializer.validated_data["name"]
        email = serializer.validated_data["email"].lower().strip()
        password = serializer.validated_data["password"]
        invite_code = serializer.validated_data.get("invite_code")

        try:
            invite = CoachInvite.objects.get(code=invite_code, is_active=True)
            if invite.expires_at and invite.expires_at < timezone.now():
                raise CoachInvite.DoesNotExist
            if invite.max_uses and invite.use_count >= invite.max_uses:
                raise CoachInvite.DoesNotExist
        except CoachInvite.DoesNotExist:
            return Response(
                {"error": "A valid invite link is required to create an account."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(email=email).exists():
            return Response(
                {"error": "Email already registered."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.create_user(
            name=name,
            username=email,
            email=email,
            password=password,
            xp=0,
            level=1,
            streak=0,
            coach=invite.coach,
        )
        
        invite.use_count += 1
        if invite.max_uses is None or invite.use_count >= invite.max_uses:
            invite.is_active = False
        invite.save(update_fields=["use_count", "is_active"])
        
        assign_daily_tasks(user)

        return Response(
            {
                "success": True,
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"].lower().strip()
        response_payload = {
            "success": True,
            "message": "If an account exists for this email, a reset link has been sent.",
        }

        user = User.objects.filter(email=email).first()
        if not user:
            return Response(response_payload)

        token = signing.dumps(
            {"uid": str(user.id), "pwd": user.password},
            salt=PASSWORD_RESET_SIGNING_SALT,
        )
        frontend_base_url = (getattr(settings, "FRONTEND_APP_URL", "") or "").rstrip("/")
        reset_url = f"{frontend_base_url}/?reset_token={quote(token, safe='')}" if frontend_base_url else ""

        subject = os.getenv("PASSWORD_RESET_SUBJECT", "Reset your password")  # Set per deployment
        message_lines = [
            os.getenv("PASSWORD_RESET_BODY_LINE", "You requested a password reset for your account."),
            "",
        ]
        if reset_url:
            message_lines.extend([
                "Use this link to set a new password:",
                reset_url,
            ])
        else:
            message_lines.extend([
                "Use this reset token in the app:",
                token,
            ])

        message_lines.extend([
            "",
            "If you did not request this, you can ignore this email.",
        ])
        message = "\n".join(message_lines)

        try:
            send_mail(
                subject,
                message,
                getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@example.com"),
                [email],
                fail_silently=False,
            )
        except Exception:
            logger.exception("Password reset email send failed for %s", email)

        email_backend = getattr(settings, "EMAIL_BACKEND", "")
        is_console_backend = email_backend.endswith("console.EmailBackend")
        if is_console_backend:
            response_payload["reset_token"] = token
            if reset_url:
                response_payload["reset_url"] = reset_url

        return Response(response_payload)


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token = serializer.validated_data["token"]
        new_password = serializer.validated_data["password"]

        try:
            payload = load_reset_payload(token)
            user_id = payload.get("uid")
            password_snapshot = payload.get("pwd")
            if not user_id or not password_snapshot:
                raise signing.BadSignature("Malformed token payload.")

            user = User.objects.filter(id=user_id).first()
            if not user or user.password != password_snapshot:
                raise signing.BadSignature("Stale token.")
        except signing.SignatureExpired:
            return Response(
                {"error": "This reset link has expired. Request a new one."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except signing.BadSignature:
            return Response(
                {"error": "Invalid reset link. Request a new one."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as exc:
            messages = getattr(exc, "messages", None) or ["Password does not meet requirements."]
            return Response({"error": messages[0]}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save(update_fields=["password"])

        return Response(
            {
                "success": True,
                "message": "Password reset successful. Please log in with your new password.",
            }
        )


class AuthMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        check_streak_on_login(request.user)
        user_data = UserSerializer(request.user).data
        user_data.update(get_user_stats(request.user))
        return Response(user_data)


class UserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        check_streak_on_login(request.user)
        user_data = UserSerializer(request.user).data
        user_data.update(get_user_stats(request.user))
        return Response(user_data)


class EquipBadgeView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        serializer = EquipBadgeInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        badge_id = serializer.validated_data.get("badge_id") or None
        request.user.equipped_badge = badge_id
        request.user.save(update_fields=["equipped_badge"])
        return Response({"equipped_badge": badge_id})


class UpdateNameView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        serializer = UpdateNameInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        request.user.name = serializer.validated_data["name"]
        request.user.save(update_fields=["name"])
        user_data = UserSerializer(request.user).data
        user_data.update(get_user_stats(request.user))
        return Response(user_data)


class UpdateFocusCategoryView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def patch(self, request):
        serializer = UpdateFocusCategoryInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_category = serializer.validated_data["focus_category"]
        old_category = request.user.focus_category

        request.user.focus_category = new_category
        request.user.save(update_fields=["focus_category"])

        if old_category != new_category:
            today = timezone.localdate()
            old_daily_set = get_or_create_daily_task_set(today, old_category)
            old_task_ids = list(old_daily_set.tasks.values_list("id", flat=True))
            UserTask.objects.filter(
                user=request.user,
                date=today,
                completed=False,
                is_custom=False,
                task_id__in=old_task_ids,
            ).delete()
            assign_daily_tasks(request.user, today)

        user_data = UserSerializer(request.user).data
        user_data.update(get_user_stats(request.user))
        return Response(user_data)


class SeedTasksView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        created = seed_task_templates()
        return Response(
            {
                "success": True,
                "created": created,
                "total_templates": 5,
            }
        )


class AssignDailyTasksView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        serializer = AssignDailyTasksInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        date = serializer.validated_data.get("date")
        assigned, created_count = assign_daily_tasks(request.user, date)
        return Response(
            {
                "success": True,
                "created_count": created_count,
                "tasks": UserTaskSerializer(assigned, many=True).data,
            }
        )


class DailyTasksView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        check_streak_on_login(request.user)
        serializer = DailyTasksQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        requested_user_id = serializer.validated_data.get("userId")
        if requested_user_id and requested_user_id != request.user.id:
            return Response(
                {"error": "You do not have permission to view another user's tasks."},
                status=status.HTTP_403_FORBIDDEN,
            )

        target_date = serializer.validated_data.get("date")
        assigned = get_daily_tasks(request.user, target_date)
        assigned = sorted(assigned, key=lambda item: item.task.title)
        return Response(UserTaskSerializer(assigned, many=True).data)


class GameStartView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = GameStartInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        game_type = serializer.validated_data["game_type"]
        session = GameSession.objects.create(user=request.user, game_type=game_type)
        return Response(
            {"session_id": str(session.id), "game_type": session.game_type},
            status=status.HTTP_201_CREATED,
        )


class GameDailyRemainingView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        remaining_by_type = get_daily_game_remaining_by_type(request.user)
        return Response({"remaining_by_type": remaining_by_type})


class DailyChallengeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = User.objects.get(id=request.user.id)
        daily_challenge = get_daily_challenge_status(user)
        return Response(
            {
                **daily_challenge,
                "total_xp": user.xp,
                "level": user.level,
                "streak_shields": user.streak_shields,
            }
        )


class WeeklyWarReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        report = get_weekly_war_report(request.user)
        return Response(report)


class ProfileCalendarView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()
        since = today - timedelta(days=27)

        active_dates = (
            UserTask.objects
            .filter(user=request.user, completed=True, date__gte=since, date__lte=today)
            .values_list("date", flat=True)
            .distinct()
            .order_by("date")
        )

        return Response({"active_dates": [d.isoformat() for d in active_dates]})


class ProfileFocusStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        rows = (
            UserTask.objects
            .filter(user=request.user, completed=True)
            .values("task__category")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        stats = [
            {
                "category": row["task__category"],
                "count": row["count"],
            }
            for row in rows
            if row["task__category"] not in ("general", None)
        ]

        return Response({"stats": stats})


class ChallengeCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        serializer = ChallengeCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        user = User.objects.select_for_update().get(id=request.user.id)

        xp_wager = data.get("xp_wager", 0)
        if xp_wager > 0 and user.xp < xp_wager:
            return Response(
                {"error": "You don't have enough XP to wager that amount."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        challenger_metric = data.get("challenger_metric")
        if data["game_type"] in CHALLENGE_SCORE_BASED_GAME_TYPES and challenger_metric is None:
            challenger_metric = float(data["challenger_score"])

        challenge = Challenge.objects.create(
            challenger=user,
            game_type=data["game_type"],
            challenger_score=data["challenger_score"] if data["game_type"] in CHALLENGE_SCORE_BASED_GAME_TYPES else 1,
            challenger_metric=challenger_metric,
            challenger_xp_wager=xp_wager,
            seed=data.get("seed", {}),
            expires_at=timezone.now() + timedelta(hours=CHALLENGE_EXPIRY_HOURS),
            status=Challenge.STATUS_OPEN,
        )

        return Response(
            {
                "success": True,
                "challenge": serialize_challenge(challenge, request.user),
                "share_url": f"/?challenge={str(challenge.id)}",
            },
            status=status.HTTP_201_CREATED,
        )


class ChallengeDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            challenge = Challenge.objects.select_related("challenger", "opponent").get(id=pk)
        except Challenge.DoesNotExist:
            return Response({"error": "Challenge not found."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user if request.user.is_authenticated else None
        return Response(serialize_challenge(challenge, user))


class ChallengeAcceptView(APIView):
    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request, pk):
        serializer = ChallengeAcceptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            challenge = (
                Challenge.objects
                .select_for_update()
                .select_related("challenger")
                .get(id=pk)
            )
        except Challenge.DoesNotExist:
            return Response({"error": "Challenge not found."}, status=status.HTTP_404_NOT_FOUND)

        now = timezone.now()

        # Only authenticated users can be the opponent
        request_user = request.user if request.user.is_authenticated else None

        # Prevent challenger from accepting their own challenge
        if request_user and challenge.challenger_id == request_user.id:
            return Response(
                {"error": "You can't accept your own challenge."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Already completed — block replaying
        if challenge.status == Challenge.STATUS_COMPLETED:
            return Response(
                {"error": "This challenge has already been completed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Expired — block accepting
        if challenge.expires_at < now:
            challenge.status = Challenge.STATUS_EXPIRED
            challenge.save(update_fields=["status"])
            return Response(
                {"error": "This challenge has expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        opponent_score = serializer.validated_data["opponent_score"]
        opponent_metric = serializer.validated_data.get("opponent_metric")

        # Normalise non-score-based submissions
        if challenge.game_type not in CHALLENGE_SCORE_BASED_GAME_TYPES:
            opponent_score = 1 if opponent_score >= 1 else 0
            # metric is required for time/rounds-based games when the opponent completed
            if opponent_score >= 1 and opponent_metric is None:
                return Response(
                    {"error": "opponent_metric is required for this game type."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        elif opponent_metric is None:
            # Score-based: metric mirrors the score
            opponent_metric = float(opponent_score)

        challenger_score = challenge.challenger_score
        wager = challenge.challenger_xp_wager

        winner = resolve_challenge_winner(
            challenge.game_type,
            challenger_score,
            opponent_score,
            challenge.challenger_metric,
            opponent_metric,
        )

        # Persist the result
        challenge.opponent = request_user if request_user else None
        challenge.opponent_score = opponent_score
        challenge.opponent_metric = opponent_metric
        challenge.winner = winner
        challenge.status = Challenge.STATUS_COMPLETED
        challenge.completed_at = now
        challenge.save(update_fields=[
            "opponent", "opponent_score", "opponent_metric",
            "winner", "status", "completed_at",
        ])

        # ── XP wager transfer ─────────────────────────────────────────────────
        # Rules:
        # 1. Only transfer if both sides are authenticated users with XP balances.
        # 2. Guests playing a wagered challenge skip the transfer entirely — show CTA.
        # 3. Wager XP bypasses daily game caps and does NOT grant streak shields.
        # 4. A tie means nobody loses XP.
        xp_gained = 0
        xp_lost = 0
        guest_played = request_user is None

        if wager > 0 and not guest_played and winner != Challenge.WINNER_TIE:
            # Re-fetch both users with row locks to prevent race conditions
            challenger_user = User.objects.select_for_update().get(id=challenge.challenger_id)
            opponent_user = User.objects.select_for_update().get(id=request_user.id)

            if winner == Challenge.WINNER_OPPONENT:
                # Opponent wins: take XP from challenger, give to opponent
                xp_gained = transfer_xp_wager(challenger_user, opponent_user, wager)
            else:
                # Challenger wins: take XP from opponent, give to challenger
                xp_lost = transfer_xp_wager(opponent_user, challenger_user, wager)

        return Response(
            {
                "success": True,
                "challenge": serialize_challenge(challenge, request_user),
                "xp_gained": xp_gained,
                "xp_lost": xp_lost,
                "result": winner,
                "your_score": opponent_score,
                "your_metric": opponent_metric,
                "their_score": challenger_score,
                "their_metric": challenge.challenger_metric,
                "guest_played": guest_played,
                "wager": wager,
            }
        )


class ChallengeListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        challenges = (
            Challenge.objects
            .select_related("challenger", "opponent")
            .filter(Q(challenger=request.user) | Q(opponent=request.user))
            .exclude(status=Challenge.STATUS_EXPIRED)
            .exclude(Q(status=Challenge.STATUS_OPEN, expires_at__lt=now))
            .order_by("-created_at")[:20]
        )

        serialized = []
        for challenge in challenges:
            data = serialize_challenge(challenge, request.user)
            data["actual_xp_transferred"] = 0
            data["xp_was_gained"] = False

            if challenge.status == Challenge.STATUS_COMPLETED and challenge.challenger_xp_wager > 0 and challenge.completed_at:
                wager_log = (
                    XPLog.objects
                    .filter(
                        user=request.user,
                        source=XPLog.SOURCE_WAGER,
                        created_at__gte=challenge.completed_at - timedelta(seconds=10),
                        created_at__lte=challenge.completed_at + timedelta(seconds=10),
                    )
                    .order_by("-created_at")
                    .first()
                )

                if wager_log:
                    data["actual_xp_transferred"] = abs(wager_log.amount)
                    data["xp_was_gained"] = wager_log.amount > 0

            serialized.append(data)

        return Response({
            "challenges": serialized,
        })


class PushSubscriptionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PushSubscriptionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        PushSubscription.objects.update_or_create(
            endpoint=serializer.validated_data["endpoint"],
            defaults={
                "user": request.user,
                "p256dh": serializer.validated_data["p256dh"],
                "auth": serializer.validated_data["auth"],
            },
        )

        return Response({"success": True}, status=status.HTTP_201_CREATED)

    def delete(self, request):
        endpoint = request.data.get("endpoint")
        if endpoint:
            PushSubscription.objects.filter(user=request.user, endpoint=endpoint).delete()
        return Response({"success": True})


class GameSubmitView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        serializer = GameSubmitInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        session = get_game_session(
            serializer.validated_data["session_id"],
            request.user,
            for_update=True,
        )

        if session.ended_at is not None:
            return Response(
                {"error": "This game session has already been submitted."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.now()
        duration_seconds = (now - session.started_at).total_seconds()
        score = serializer.validated_data["score"]
        is_challenge = serializer.validated_data.get("is_challenge", False)

        try:
            validate_game_duration(session.game_type, duration_seconds)
            validate_game_score(session.game_type, score)
        except ValidationError as exc:
            return Response(
                {"error": get_validation_error_message(exc, fallback="Invalid game submission.")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.select_for_update().get(id=request.user.id)
        check_streak_on_login(user)
        xp = calculate_game_session_xp_for_type(session.game_type, score)

        if is_challenge:
            game_xp_today = get_today_game_xp(user, session.game_type)
            session.ended_at = now
            session.score = score
            session.xp_awarded = 0
            session.save(update_fields=["ended_at", "score", "xp_awarded"])
            daily_challenge = get_daily_challenge_status(user)
            return Response(
                {
                    "game_type": session.game_type,
                    "score": score,
                    "xp_calculated": xp,
                    "xp_awarded": 0,
                    "daily_cap": None,
                    "today_game_xp_before": game_xp_today,
                    "remaining_today": None,
                    "capped_by_daily_limit": False,
                    "total_xp": user.xp,
                    "level": user.level,
                    "streak_shields": user.streak_shields,
                    "xp_milestone_shields_awarded": 0,
                    "war_mode_shields_awarded": 0,
                    "daily_challenge_shields_awarded": 0,
                    "total_shields_awarded": 0,
                    "daily_challenge_xp_awarded": 0,
                    "daily_challenge": daily_challenge,
                }
            )

        daily_cap = get_daily_game_xp_cap(session.game_type)

        if daily_cap is None:
            game_xp_today = 0
            remaining_today = None
            xp_awarded = xp
            capped_by_daily_limit = False
        else:
            game_xp_today = get_today_game_xp(user, session.game_type)
            remaining = daily_cap - game_xp_today
            xp_awarded = 0 if remaining <= 0 else min(xp, remaining)
            remaining_today = max(0, remaining - xp_awarded)
            capped_by_daily_limit = xp_awarded < xp

        session.ended_at = now
        session.score = score
        session.xp_awarded = xp_awarded
        session.save(update_fields=["ended_at", "score", "xp_awarded"])
        milestone_shields_awarded = 0
        war_mode_shields_awarded = 0

        if xp_awarded > 0:
            milestone_shields_awarded = increment_user_xp(user, xp_awarded)
            if session.game_type == "war_mode_full_war":
                war_mode_shields_awarded = grant_streak_shields(user, 1)
                if war_mode_shields_awarded > 0:
                    user.save(update_fields=["streak_shields"])

        total_shields_awarded = milestone_shields_awarded + war_mode_shields_awarded

        create_xp_log(user, XPLog.SOURCE_GAME, xp_awarded)
        update_streak(user)
        daily_challenge = check_and_award_daily_challenge(user)
        daily_challenge_shields_awarded = daily_challenge.get("xp_milestone_shields_awarded", 0)
        total_shields_awarded += daily_challenge_shields_awarded

        return Response(
            {
                "game_type": session.game_type,
                "score": score,
                "xp_calculated": xp,
                "xp_awarded": xp_awarded,
                "daily_cap": daily_cap,
                "today_game_xp_before": game_xp_today,
                "remaining_today": remaining_today,
                "capped_by_daily_limit": capped_by_daily_limit,
                "total_xp": user.xp,
                "level": user.level,
                "streak_shields": user.streak_shields,
                "xp_milestone_shields_awarded": milestone_shields_awarded,
                "war_mode_shields_awarded": war_mode_shields_awarded,
                "daily_challenge_shields_awarded": daily_challenge_shields_awarded,
                "total_shields_awarded": total_shields_awarded,
                "daily_challenge_xp_awarded": daily_challenge.get("xp_awarded_now", 0),
                "daily_challenge": daily_challenge,
            }
        )


class LeaderboardView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        serializer = LeaderboardQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        limit = serializer.validated_data.get("limit", 20)
        period = serializer.validated_data.get("period", "weekly")
        current_user = request.user if request.user.is_authenticated else None
        entries, current_user_rank, total_users = get_leaderboard(current_user, limit, period)
        return Response(
            {
                "period": period,
                "total_users": total_users,
                "your_rank": current_user_rank["rank"] if current_user_rank else None,
                "top_users": entries,
                "entries": entries,
                "current_user_rank": current_user_rank,
            }
        )


class PrestigeLeaderboardView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            limit = int(request.query_params.get("limit", 50))
        except (TypeError, ValueError):
            limit = 50
        limit = max(1, min(limit, 100))

        current_user = request.user if request.user.is_authenticated else None
        entries, current_user_rank, total_users = get_prestige_leaderboard(current_user, limit)
        return Response(
            {
                "total": total_users,
                "your_rank": current_user_rank["rank"] if current_user_rank else None,
                "entries": entries,
            }
        )


class JournalView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()
        entry = JournalEntry.objects.filter(user=request.user, date=today).first()

        if not entry:
            return Response({"entry": None})

        return Response({"entry": JournalEntrySerializer(entry).data})

    @transaction.atomic
    def post(self, request):
        serializer = JournalEntryInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        today = timezone.localdate()
        entry, created = JournalEntry.objects.get_or_create(
            user=request.user,
            date=today,
            defaults={
                "mood": "",
                "weather": "",
                "activity": "",
                "mood_score": None,
                "energy_score": None,
                "objective": "",
            },
        )

        if "mood_score" in serializer.validated_data:
            entry.mood_score = serializer.validated_data["mood_score"]
        if "energy_score" in serializer.validated_data:
            entry.energy_score = serializer.validated_data["energy_score"]
        if "objective" in serializer.validated_data:
            entry.objective = serializer.validated_data["objective"]

        entry.save()

        user = User.objects.select_for_update().get(id=request.user.id)
        xp_awarded = 0
        if created:
            check_streak_on_login(user)
            xp_awarded = JOURNAL_DAILY_XP
            increment_user_xp(user, xp_awarded)
            create_xp_log(user, XPLog.SOURCE_JOURNAL, xp_awarded)
            update_streak(user)

        daily_challenge = check_and_award_daily_challenge(user)

        return Response(
            {
                "entry": JournalEntrySerializer(entry).data,
                "xp_awarded": xp_awarded,
                "daily_cap": JOURNAL_DAILY_XP,
                "already_awarded_today": not created,
                "total_xp": user.xp,
                "level": user.level,
                "streak": user.streak,
                "daily_challenge_xp_awarded": daily_challenge.get("xp_awarded_now", 0),
                "daily_challenge": daily_challenge,
            }
        )


class JournalHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        entries = JournalEntry.objects.filter(user=request.user).order_by("-date")[:7]
        return Response(JournalEntrySerializer(entries, many=True).data)


class FocusPoolTasksView(APIView):
    """
    GET /api/tasks/pool/?category=study
    Returns tasks from the pool for the user's focus category (or provided one).
    Excludes tasks already assigned to the user today.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = FocusPoolQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        category = (
            serializer.validated_data.get("category")
            or request.user.focus_category
            or "discipline"
        )

        today = timezone.localdate()
        already_assigned_task_ids = set(
            UserTask.objects.filter(user=request.user, date=today)
            .values_list("task_id", flat=True)
        )

        tasks = (
            Task.objects.filter(category=category)
            .exclude(title__startswith=CUSTOM_TASK_PREFIX)
            .exclude(id__in=already_assigned_task_ids)
            .order_by("title")
        )

        return Response([
            {
                "id": str(task.id),
                "title": task.title,
                "xp": task.xp,
                "category": task.category,
            }
            for task in tasks
        ])


class CreateUserTaskView(APIView):
    """
    POST /api/tasks/create/
    Adds a task to the user's today list.
    - source='pool'  → add a predefined Task by pool_task_id
    - source='custom' → create an ad-hoc task with a user-provided title
    """
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        serializer = CreateCustomTaskInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        today = timezone.localdate()
        source = serializer.validated_data["source"]

        if source == "pool":
            pool_task_id = serializer.validated_data["pool_task_id"]
            try:
                task = Task.objects.get(id=pool_task_id)
            except Task.DoesNotExist:
                return Response(
                    {"error": "Task not found in pool."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if UserTask.objects.filter(user=request.user, task=task, date=today).exists():
                return Response(
                    {"error": "This task is already in your list for today."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            user_task = UserTask.objects.create(
                user=request.user,
                task=task,
                date=today,
                completed=False,
                is_custom=False,
            )
        else:
            title = serializer.validated_data["title"]
            category = (
                serializer.validated_data.get("category")
                or request.user.focus_category
                or "discipline"
            )
            task, _ = Task.objects.get_or_create(
                title=f"{CUSTOM_TASK_PREFIX}{title}",
                defaults={
                    "xp": TASK_XP_AMOUNT,
                    "category": category,
                },
            )
            user_task = UserTask.objects.create(
                user=request.user,
                task=task,
                date=today,
                completed=False,
                is_custom=True,
                custom_title=title,
                custom_category=category,
            )

        today_xp_eligible_count = get_today_completed_task_count(request.user, today)
        xp_will_be_awarded = today_xp_eligible_count < XP_ELIGIBLE_TASK_COUNT
        task_title = user_task.custom_title if user_task.is_custom else user_task.task.title
        task_category = (
            user_task.custom_category if user_task.is_custom and user_task.custom_category
            else user_task.task.category
        )

        return Response(
            {
                "id": str(user_task.id),
                "task": str(user_task.task_id),
                "task_title": task_title,
                "task_xp": TASK_XP_AMOUNT if xp_will_be_awarded else 0,
                "task_category": task_category,
                "date": str(user_task.date),
                "completed": user_task.completed,
                "is_custom": user_task.is_custom,
                "xp_will_be_awarded": xp_will_be_awarded,
            },
            status=status.HTTP_201_CREATED,
        )


class DeleteUserTaskView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def delete(self, request, pk):
        user_task = get_user_task(pk, for_update=True)
        if user_task.user_id != request.user.id:
            return Response(
                {"error": "You do not have permission to delete this task."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not user_task.is_custom:
            return Response(
                {"error": "Only custom tasks can be deleted."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if user_task.completed:
            return Response(
                {"error": "Completed tasks cannot be deleted."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user_task.delete()
        return Response({"success": True, "id": str(pk)})


class CompleteTaskView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        serializer = CompleteTaskInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_task = get_user_task(serializer.validated_data["userTaskId"], for_update=True)
        if user_task.user_id != request.user.id:
            return Response(
                {"error": "You do not have permission to complete this task."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if user_task.completed:
            return Response(
                {"error": "Task already completed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        target_date = user_task.date
        today_completed = get_today_completed_task_count(request.user, target_date)
        xp_eligible = today_completed < XP_ELIGIBLE_TASK_COUNT
        xp_earned = TASK_XP_AMOUNT if xp_eligible else 0

        user_task.completed = True
        user_task.completed_at = timezone.now()
        user_task.save(update_fields=["completed", "completed_at"])

        user = User.objects.select_for_update().get(id=request.user.id)
        check_streak_on_login(user)

        xp_milestone_shields = 0
        if xp_earned > 0:
            xp_milestone_shields = increment_user_xp(user, xp_earned)
            create_xp_log(user, XPLog.SOURCE_TASK, xp_earned)

        update_streak(user)

        perfect_week_shields = 0
        completed_today = user.user_tasks.filter(date=target_date, completed=True).count()
        if completed_today >= 5:
            perfect_week_shields = award_shield_for_perfect_week(user, target_date)
            if perfect_week_shields > 0:
                user.save(update_fields=["streak_shields", "last_perfect_week_shield_date"])

        total_shields_awarded = xp_milestone_shields + perfect_week_shields
        total_tasks_completed = user.user_tasks.filter(completed=True).count()
        daily_challenge = check_and_award_daily_challenge(user)
        daily_challenge_shields_awarded = daily_challenge.get("xp_milestone_shields_awarded", 0)
        total_shields_awarded += daily_challenge_shields_awarded

        return Response(
            {
                "success": True,
                "xp_earned": xp_earned,
                "xp_eligible": xp_eligible,
                "tasks_completed_today": today_completed + 1,
                "xp_eligible_remaining": max(0, XP_ELIGIBLE_TASK_COUNT - (today_completed + 1)),
                "level": user.level,
                "streak": user.streak,
                "total_xp": user.xp,
                "streak_shields": user.streak_shields,
                "xp_milestone_shields_awarded": xp_milestone_shields,
                "perfect_week_shields_awarded": perfect_week_shields,
                "daily_challenge_shields_awarded": daily_challenge_shields_awarded,
                "total_shields_awarded": total_shields_awarded,
                "total_tasks_completed": total_tasks_completed,
                "daily_challenge_xp_awarded": daily_challenge.get("xp_awarded_now", 0),
                "daily_challenge": daily_challenge,
            }
        )


class AddGameXPView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        serializer = GameXPInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = User.objects.select_for_update().get(id=request.user.id)
        check_streak_on_login(user)
        requested_xp = serializer.validated_data["xpEarned"]
        game_type = serializer.validated_data["game_type"]

        daily_cap = get_daily_game_xp_cap(game_type)
        game_xp_today = get_today_game_xp(user, game_type)
        remaining = daily_cap - game_xp_today
        if remaining <= 0:
            return Response(
                {"error": "Daily game XP cap reached.", "daily_cap": daily_cap, "game_type": game_type},
                status=status.HTTP_400_BAD_REQUEST,
            )

        granted = min(requested_xp, remaining)
        milestone_shields_awarded = increment_user_xp(user, granted)
        create_xp_log(user, XPLog.SOURCE_GAME, granted)
        update_streak(user)

        response_status = status.HTTP_200_OK
        if granted < requested_xp:
            response_status = status.HTTP_206_PARTIAL_CONTENT

        return Response(
            {
                "success": True,
                "game_type": game_type,
                "xp_granted": granted,
                "requested_xp": requested_xp,
                "daily_cap": daily_cap,
                "remaining_today": max(0, remaining - granted),
                "level": user.level,
                "total_xp": user.xp,
                "streak": user.streak,
                "streak_shields": user.streak_shields,
                "xp_milestone_shields_awarded": milestone_shields_awarded,
                "total_shields_awarded": milestone_shields_awarded,
            },
            status=response_status,
        )


class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]


class RefreshTokenView(TokenRefreshView):
    permission_classes = [AllowAny]

from rest_framework.permissions import BasePermission

class IsCoach(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_coach)

class CoachInviteView(APIView):
    permission_classes = [IsCoach]

    def get(self, request):
        import string
        import random
        invite = CoachInvite.objects.filter(coach=request.user, is_active=True).first()
        if not invite:
            code = ''.join(random.choices(string.ascii_letters + string.digits, k=12))
            invite = CoachInvite.objects.create(coach=request.user, code=code, max_uses=1)
        
        serializer = CoachInviteSerializer(invite, context={"request": request})
        return Response(serializer.data)

class CoachInviteRegenerateView(APIView):
    permission_classes = [IsCoach]

    def post(self, request):
        import string
        import random
        # Invalidate old invites
        CoachInvite.objects.filter(coach=request.user, is_active=True).update(is_active=False)
        # Create new invite
        code = ''.join(random.choices(string.ascii_letters + string.digits, k=12))
        invite = CoachInvite.objects.create(coach=request.user, code=code, max_uses=1)
        
        serializer = CoachInviteSerializer(invite, context={"request": request})
        return Response(serializer.data)

class CoachInvitePreviewView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, code):
        try:
            invite = CoachInvite.objects.get(code=code, is_active=True)
            if invite.expires_at and invite.expires_at < timezone.now():
                raise CoachInvite.DoesNotExist
            if invite.max_uses and invite.use_count >= invite.max_uses:
                raise CoachInvite.DoesNotExist
            
            return Response({
                "valid": True,
                "coach_name": invite.coach.name or "Your Coach",
            })
        except CoachInvite.DoesNotExist:
            return Response({"valid": False}, status=status.HTTP_404_NOT_FOUND)

class CoachClientListView(APIView):
    permission_classes = [IsCoach]

    def get(self, request):
        from .services import get_week_adherence, compute_client_risk_level, get_current_week_window
        clients = request.user.clients.all()
        serializer = ClientRosterSerializer(clients, many=True)
        data = serializer.data
        
        for item in data:
            client_user = next(u for u in clients if str(u.id) == item["id"])
            adherence = get_week_adherence(client_user)
            item["week_adherence_pct"] = adherence["pct"]
            item["risk_level"] = compute_client_risk_level(client_user)
            
            import datetime
            prev_week_start, _ = get_current_week_window(reference_date=timezone.localtime().date() - datetime.timedelta(days=7))
            prev_adherence = get_week_adherence(client_user, week_start_date=prev_week_start)
            item["prev_week_adherence_pct"] = prev_adherence["pct"]
            
            if adherence["pct"] > prev_adherence["pct"] + 5:
                item["adherence_trend"] = "up"
            elif adherence["pct"] < prev_adherence["pct"] - 5:
                item["adherence_trend"] = "down"
            else:
                item["adherence_trend"] = "stable"

        return Response(data)

class CoachClientDetailView(APIView):
    permission_classes = [IsCoach]

    def get(self, request, client_id):
        from .services import get_week_adherence, compute_client_risk_level, get_current_week_window
        from django.shortcuts import get_object_or_404
        client = get_object_or_404(request.user.clients.all(), id=client_id)
        
        serializer = ClientDetailSerializer(client)
        data = serializer.data
        
        adherence = get_week_adherence(client)
        data["week_adherence_pct"] = adherence["pct"]
        data["risk_level"] = compute_client_risk_level(client)
        
        import datetime
        prev_week_start, _ = get_current_week_window(reference_date=timezone.localtime().date() - datetime.timedelta(days=7))
        prev_adherence = get_week_adherence(client, week_start_date=prev_week_start)
        data["prev_week_adherence_pct"] = prev_adherence["pct"]
        
        if adherence["pct"] > prev_adherence["pct"] + 5:
            data["adherence_trend"] = "up"
        elif adherence["pct"] < prev_adherence["pct"] - 5:
            data["adherence_trend"] = "down"
        else:
            data["adherence_trend"] = "stable"
            
        data["weekly_report"] = get_weekly_war_report(client)
        
        from .services import get_active_dates
        data["calendar"] = get_active_dates(client, since_days=28)
        
        # Journal trend
        recent_journals = JournalEntry.objects.filter(user=client).order_by("-date")[:14]
        trend = []
        for j in reversed(recent_journals):
            if j.mood_score is not None:
                trend.append({"date": j.date.isoformat(), "mood_score": j.mood_score, "energy_score": j.energy_score})
        data["journal_trend"] = trend
        
        # Today's tasks
        today = timezone.localtime().date()
        tasks = UserTask.objects.filter(user=client, date=today).select_related("task").order_by("created_at")
        data["tasks"] = UserTaskSerializer(tasks, many=True).data

        return Response(data)

class CoachClientNoteView(APIView):
    permission_classes = [IsCoach]

    def patch(self, request, client_id):
        from django.shortcuts import get_object_or_404
        client = get_object_or_404(request.user.clients.all(), id=client_id)
        
        serializer = CoachNoteInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        client.coach_note = serializer.validated_data["note"]
        client.save(update_fields=["coach_note"])
        
        return Response({"success": True})

class CoachClientTaskCreateView(APIView):
    permission_classes = [IsCoach]

    @transaction.atomic
    def post(self, request, client_id):
        from django.shortcuts import get_object_or_404
        client = get_object_or_404(request.user.clients.all(), id=client_id)
        
        serializer = CreateClientTaskInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        title = serializer.validated_data["title"]
        category = serializer.validated_data.get("category", "general")
        target_date = serializer.validated_data.get("date") or timezone.localtime().date()
        
        task, _ = Task.objects.get_or_create(
            title=f"{CUSTOM_TASK_PREFIX}{title}",
            defaults={
                "xp": TASK_XP_AMOUNT,
                "category": category,
            },
        )
        
        user_task = UserTask.objects.create(
            user=client,
            task=task,
            date=target_date,
            completed=False,
            is_custom=True,
            custom_title=title,
            custom_category=category,
        )
        
        return Response(UserTaskSerializer(user_task).data, status=status.HTTP_201_CREATED)

class CoachClientTaskHistoryView(APIView):
    permission_classes = [IsCoach]

    def get(self, request, client_id):
        from django.shortcuts import get_object_or_404
        client = get_object_or_404(request.user.clients.all(), id=client_id)
        
        serializer = ClientTaskHistoryQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        
        import datetime
        end_date = serializer.validated_data.get("date") or timezone.localtime().date()
        days_range = serializer.validated_data.get("range", 7)
        start_date = end_date - datetime.timedelta(days=days_range - 1)
        
        tasks = UserTask.objects.filter(user=client, date__gte=start_date, date__lte=end_date).select_related("task").order_by("-date", "created_at")
        
        return Response({
            "start_date": start_date,
            "end_date": end_date,
            "tasks": UserTaskSerializer(tasks, many=True).data
        })
