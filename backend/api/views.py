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
    CoachLeaderboardQuerySerializer,
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
    assign_program_to_client,
    assign_program_to_group,
    assign_task_to_group,
    calculate_game_session_xp_for_type,
    check_and_award_daily_challenge,
    check_streak_on_login,
    create_client_task,
    create_xp_log,
    get_today_completed_task_count,
    get_daily_challenge_status,
    get_daily_game_xp_cap,
    get_daily_game_remaining_by_type,
    get_or_create_daily_task_set,
    get_daily_tasks,
    CUSTOM_TASK_PREFIX,
    get_game_session,
    get_coach_leaderboard,
    get_active_user_count,
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

        # Auto-subscribe new client to coach's default Weight metric
        # so weight tracking works immediately with zero coach setup.
        from .models import MetricDefinition, ClientMetricSubscription
        weight_metric = MetricDefinition.ensure_default_weight(invite.coach)
        ClientMetricSubscription.objects.get_or_create(
            client=user, metric_definition=weight_metric,
        )

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
        old_category = request.user.focus_category or User.FOCUS_DISCIPLINE

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



class ActiveUserCountView(APIView):
    """Lightweight public endpoint for social-proof user count."""
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"total_users": get_active_user_count()})


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
        clients = request.user.clients.select_related('client_group').all()

        # Optional group filter
        group_id = request.query_params.get("group")
        if group_id:
            clients = clients.filter(client_group_id=group_id)

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
        
        user_task = create_client_task(client, title, category, target_date)
        
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


# ── Client Groups: Coach Endpoints ──────────────────────────────────────────

from .models import ClientGroup
from .serializers import (
    ClientGroupSerializer, ClientGroupDetailSerializer,
    ClientGroupInputSerializer, AddGroupMembersInputSerializer,
    AssignProgramToGroupInputSerializer, AssignTaskToGroupInputSerializer,
)


class CoachGroupListView(APIView):
    permission_classes = [IsCoach]

    def get(self, request):
        groups = (
            ClientGroup.objects
            .filter(coach=request.user)
            .annotate(member_count=Count("members"))
        )
        return Response(ClientGroupSerializer(groups, many=True).data)

    def post(self, request):
        serializer = ClientGroupInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        group = ClientGroup.objects.create(
            coach=request.user,
            **serializer.validated_data,
        )
        return Response(
            ClientGroupSerializer(group).data,
            status=status.HTTP_201_CREATED,
        )


class CoachGroupDetailView(APIView):
    permission_classes = [IsCoach]

    def _get_group(self, request, pk):
        from django.shortcuts import get_object_or_404
        return get_object_or_404(ClientGroup, id=pk, coach=request.user)

    def get(self, request, pk):
        group = self._get_group(request, pk)
        return Response(ClientGroupDetailSerializer(group).data)

    def patch(self, request, pk):
        group = self._get_group(request, pk)
        serializer = ClientGroupInputSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        for key, value in serializer.validated_data.items():
            setattr(group, key, value)
        group.save()
        return Response(ClientGroupDetailSerializer(group).data)

    def delete(self, request, pk):
        group = self._get_group(request, pk)
        # SET_NULL on FK handles clearing client_group for all members
        group.delete()
        return Response({"success": True}, status=status.HTTP_204_NO_CONTENT)


class CoachGroupMemberAddView(APIView):
    permission_classes = [IsCoach]

    def post(self, request, pk):
        from django.shortcuts import get_object_or_404
        group = get_object_or_404(ClientGroup, id=pk, coach=request.user)

        serializer = AddGroupMembersInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        client_ids = serializer.validated_data["client_ids"]
        # Only update clients that belong to this coach
        updated = User.objects.filter(
            id__in=client_ids,
            coach=request.user,
        ).update(client_group=group)

        return Response({
            "added_count": updated,
            "group_id": str(group.id),
        })


class CoachGroupMemberRemoveView(APIView):
    permission_classes = [IsCoach]

    def delete(self, request, pk, client_id):
        from django.shortcuts import get_object_or_404
        group = get_object_or_404(ClientGroup, id=pk, coach=request.user)
        client = get_object_or_404(
            User, id=client_id, coach=request.user, client_group=group,
        )
        client.client_group = None
        client.save(update_fields=["client_group"])
        return Response({"success": True}, status=status.HTTP_204_NO_CONTENT)


class CoachGroupAssignProgramView(APIView):
    permission_classes = [IsCoach]

    @transaction.atomic
    def post(self, request, pk):
        from django.shortcuts import get_object_or_404
        group = get_object_or_404(ClientGroup, id=pk, coach=request.user)

        serializer = AssignProgramToGroupInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        program = get_object_or_404(
            Program, id=serializer.validated_data["program_id"], coach=request.user,
        )
        start_date = serializer.validated_data.get("start_date") or timezone.localdate()

        result = assign_program_to_group(
            coach=request.user,
            group=group,
            program=program,
            start_date=start_date,
            assigned_by=request.user,
        )
        return Response(result)


class CoachGroupAssignTaskView(APIView):
    permission_classes = [IsCoach]

    @transaction.atomic
    def post(self, request, pk):
        from django.shortcuts import get_object_or_404
        group = get_object_or_404(ClientGroup, id=pk, coach=request.user)

        serializer = AssignTaskToGroupInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        title = serializer.validated_data["title"]
        category = serializer.validated_data.get("category", "general")
        target_date = serializer.validated_data.get("date") or timezone.localdate()

        result = assign_task_to_group(
            coach=request.user,
            group=group,
            title=title,
            category=category,
            target_date=target_date,
        )
        return Response(result)


# ── Workout System: Coach Endpoints ─────────────────────────────────────────

from .models import (
    Exercise, Program, WorkoutDay, WorkoutDayExercise,
    ProgramAssignment, WorkoutLog, WorkoutLogExercise,
)
from .serializers import (
    ExerciseSerializer, ExerciseInputSerializer,
    ProgramSerializer, ProgramListSerializer, ProgramInputSerializer,
    WorkoutDaySerializer, WorkoutDayInputSerializer,
    WorkoutDayExerciseSerializer, WorkoutDayExerciseInputSerializer,
    AssignProgramInputSerializer, ProgramAssignmentSerializer,
    WorkoutLogSerializer, SubmitWorkoutLogInputSerializer,
    WorkoutHistoryQuerySerializer,
)
from .services import (
    WORKOUT_XP_AMOUNT,
    get_active_program_assignment,
    get_todays_workout_day,
    get_or_create_workout_log,
    submit_workout_log,
)


class CoachExerciseListView(APIView):
    permission_classes = [IsCoach]

    def get(self, request):
        exercises = Exercise.objects.filter(coach=request.user)
        return Response(ExerciseSerializer(exercises, many=True).data)

    def post(self, request):
        serializer = ExerciseInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        exercise = Exercise.objects.create(
            coach=request.user,
            **serializer.validated_data,
        )
        return Response(ExerciseSerializer(exercise).data, status=status.HTTP_201_CREATED)


class CoachExerciseDetailView(APIView):
    permission_classes = [IsCoach]

    def _get_exercise(self, request, pk):
        from django.shortcuts import get_object_or_404
        return get_object_or_404(Exercise, id=pk, coach=request.user)

    def patch(self, request, pk):
        exercise = self._get_exercise(request, pk)
        serializer = ExerciseInputSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        for key, value in serializer.validated_data.items():
            setattr(exercise, key, value)
        exercise.save()
        return Response(ExerciseSerializer(exercise).data)

    def delete(self, request, pk):
        exercise = self._get_exercise(request, pk)
        exercise.delete()
        return Response({"success": True}, status=status.HTTP_204_NO_CONTENT)


class CoachProgramListView(APIView):
    permission_classes = [IsCoach]

    def get(self, request):
        programs = Program.objects.filter(coach=request.user)
        return Response(ProgramListSerializer(programs, many=True).data)

    def post(self, request):
        serializer = ProgramInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        program = Program.objects.create(
            coach=request.user,
            **serializer.validated_data,
        )
        return Response(ProgramSerializer(program).data, status=status.HTTP_201_CREATED)


class CoachProgramDetailView(APIView):
    permission_classes = [IsCoach]

    def _get_program(self, request, pk):
        from django.shortcuts import get_object_or_404
        return get_object_or_404(
            Program.objects.prefetch_related(
                "workout_days__exercises__exercise",
            ),
            id=pk,
            coach=request.user,
        )

    def get(self, request, pk):
        program = self._get_program(request, pk)
        return Response(ProgramSerializer(program).data)

    def patch(self, request, pk):
        program = self._get_program(request, pk)
        serializer = ProgramInputSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        for key, value in serializer.validated_data.items():
            setattr(program, key, value)
        program.save()
        return Response(ProgramSerializer(program).data)

    def delete(self, request, pk):
        program = self._get_program(request, pk)
        program.delete()
        return Response({"success": True}, status=status.HTTP_204_NO_CONTENT)


class CoachProgramDayCreateView(APIView):
    permission_classes = [IsCoach]

    def post(self, request, pk):
        from django.shortcuts import get_object_or_404
        program = get_object_or_404(Program, id=pk, coach=request.user)

        serializer = WorkoutDayInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        weekday = serializer.validated_data["weekday"]
        if WorkoutDay.objects.filter(program=program, weekday=weekday).exists():
            return Response(
                {"error": f"This program already has a workout day for {dict(WorkoutDay._meta.get_field('weekday').choices).get(weekday, weekday)}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        day = WorkoutDay.objects.create(
            program=program,
            **serializer.validated_data,
        )
        return Response(WorkoutDaySerializer(day).data, status=status.HTTP_201_CREATED)


class CoachProgramDayDetailView(APIView):
    permission_classes = [IsCoach]

    def _get_day(self, request, pk, day_id):
        from django.shortcuts import get_object_or_404
        get_object_or_404(Program, id=pk, coach=request.user)
        return get_object_or_404(WorkoutDay, id=day_id, program_id=pk)

    def patch(self, request, pk, day_id):
        day = self._get_day(request, pk, day_id)
        data = request.data
        if "title" in data:
            day.title = data["title"]
        if "weekday" in data:
            new_weekday = int(data["weekday"])
            if new_weekday != day.weekday and WorkoutDay.objects.filter(program_id=pk, weekday=new_weekday).exists():
                return Response(
                    {"error": "That weekday is already assigned in this program."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            day.weekday = new_weekday
        day.save()
        return Response(WorkoutDaySerializer(day).data)

    def delete(self, request, pk, day_id):
        day = self._get_day(request, pk, day_id)
        day.delete()
        return Response({"success": True}, status=status.HTTP_204_NO_CONTENT)


class CoachProgramDayExerciseCreateView(APIView):
    permission_classes = [IsCoach]

    def post(self, request, pk, day_id):
        from django.shortcuts import get_object_or_404
        get_object_or_404(Program, id=pk, coach=request.user)
        day = get_object_or_404(WorkoutDay, id=day_id, program_id=pk)

        serializer = WorkoutDayExerciseInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        exercise = get_object_or_404(
            Exercise, id=serializer.validated_data.pop("exercise_id"), coach=request.user,
        )

        # Auto-set order if not provided (append to end)
        order = serializer.validated_data.get("order", 0)
        if order == 0:
            max_order = WorkoutDayExercise.objects.filter(workout_day=day).count()
            order = max_order + 1

        wde = WorkoutDayExercise.objects.create(
            workout_day=day,
            exercise=exercise,
            order=order,
            prescribed_sets=serializer.validated_data.get("prescribed_sets"),
            prescribed_reps=serializer.validated_data.get("prescribed_reps", ""),
            notes=serializer.validated_data.get("notes", ""),
        )
        return Response(WorkoutDayExerciseSerializer(wde).data, status=status.HTTP_201_CREATED)


class CoachProgramDayExerciseDetailView(APIView):
    permission_classes = [IsCoach]

    def _get_wde(self, request, pk, day_id, wde_id):
        from django.shortcuts import get_object_or_404
        get_object_or_404(Program, id=pk, coach=request.user)
        get_object_or_404(WorkoutDay, id=day_id, program_id=pk)
        return get_object_or_404(WorkoutDayExercise, id=wde_id, workout_day_id=day_id)

    def patch(self, request, pk, day_id, wde_id):
        wde = self._get_wde(request, pk, day_id, wde_id)
        data = request.data
        for field in ("order", "prescribed_sets", "prescribed_reps", "notes"):
            if field in data:
                setattr(wde, field, data[field])
        wde.save()
        return Response(WorkoutDayExerciseSerializer(wde).data)

    def delete(self, request, pk, day_id, wde_id):
        wde = self._get_wde(request, pk, day_id, wde_id)
        wde.delete()
        return Response({"success": True}, status=status.HTTP_204_NO_CONTENT)


class CoachClientAssignProgramView(APIView):
    permission_classes = [IsCoach]

    @transaction.atomic
    def post(self, request, client_id):
        from django.shortcuts import get_object_or_404
        client = get_object_or_404(request.user.clients.all(), id=client_id)

        serializer = AssignProgramInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        program = get_object_or_404(
            Program, id=serializer.validated_data["program_id"], coach=request.user,
        )
        start_date = serializer.validated_data.get("start_date") or timezone.localdate()

        assignment = assign_program_to_client(client, program, start_date, request.user)
        return Response(ProgramAssignmentSerializer(assignment).data, status=status.HTTP_201_CREATED)


class CoachClientProgramView(APIView):
    permission_classes = [IsCoach]

    def get(self, request, client_id):
        from django.shortcuts import get_object_or_404
        import datetime
        client = get_object_or_404(request.user.clients.all(), id=client_id)

        assignment = get_active_program_assignment(client)
        if not assignment:
            return Response({"has_active_program": False, "assignment": None, "workout_history": []})

        # Recent workout history (last 28 days)
        end_date = timezone.localdate()
        start_date = end_date - datetime.timedelta(days=27)
        logs = (
            WorkoutLog.objects.filter(
                user=client,
                date__gte=start_date,
                date__lte=end_date,
            )
            .select_related("workout_day")
            .prefetch_related(
                "exercise_logs__workout_day_exercise__exercise",
            )
            .order_by("-date")
        )

        return Response({
            "has_active_program": True,
            "assignment": ProgramAssignmentSerializer(assignment).data,
            "workout_history": WorkoutLogSerializer(logs, many=True).data,
        })

    def delete(self, request, client_id):
        from django.shortcuts import get_object_or_404
        client = get_object_or_404(request.user.clients.all(), id=client_id)
        ProgramAssignment.objects.filter(client=client, is_active=True).update(is_active=False)
        return Response({"success": True})


# ── Workout System: Client Endpoints ────────────────────────────────────────

class WorkoutTodayView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        assignment = get_active_program_assignment(request.user)
        has_active_program = assignment is not None

        workout_day = get_todays_workout_day(request.user)
        if not workout_day:
            return Response({
                "rest_day": True,
                "has_active_program": has_active_program,
            })

        log, _ = get_or_create_workout_log(request.user, workout_day)

        # Re-fetch the log with full prefetch for serialization
        log = (
            WorkoutLog.objects.filter(id=log.id)
            .select_related("workout_day")
            .prefetch_related(
                "exercise_logs__workout_day_exercise__exercise",
            )
            .first()
        )

        return Response({
            "rest_day": False,
            "has_active_program": True,
            "workout_log": WorkoutLogSerializer(log).data,
        })


class WorkoutSubmitView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        serializer = SubmitWorkoutLogInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        log_id = serializer.validated_data["workout_log_id"]
        try:
            workout_log = WorkoutLog.objects.select_related("workout_day").get(
                id=log_id, user=request.user,
            )
        except WorkoutLog.DoesNotExist:
            return Response(
                {"error": "Workout log not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        exercise_updates = serializer.validated_data["exercises"]
        xp_awarded = submit_workout_log(request.user, workout_log, exercise_updates)

        # Refresh user and log for response
        user = User.objects.get(id=request.user.id)
        workout_log.refresh_from_db()

        # Re-fetch with prefetch for full serialization
        workout_log = (
            WorkoutLog.objects.filter(id=workout_log.id)
            .select_related("workout_day")
            .prefetch_related(
                "exercise_logs__workout_day_exercise__exercise",
            )
            .first()
        )

        return Response({
            "success": True,
            "workout_log": WorkoutLogSerializer(workout_log).data,
            "xp_awarded": xp_awarded,
            "total_xp": user.xp,
            "level": user.level,
            "streak": user.streak,
        })


class WorkoutHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        import datetime
        query_serializer = WorkoutHistoryQuerySerializer(data=request.query_params)
        query_serializer.is_valid(raise_exception=True)

        days_range = query_serializer.validated_data.get("range", 28)
        end_date = timezone.localdate()
        start_date = end_date - datetime.timedelta(days=days_range - 1)

        logs = (
            WorkoutLog.objects.filter(
                user=request.user,
                date__gte=start_date,
                date__lte=end_date,
            )
            .select_related("workout_day")
            .prefetch_related(
                "exercise_logs__workout_day_exercise__exercise",
            )
            .order_by("-date")
        )

        return Response({
            "start_date": start_date,
            "end_date": end_date,
            "logs": WorkoutLogSerializer(logs, many=True).data,
        })


# ── Body Metrics System ─────────────────────────────────────────────────────
# Privacy: Every read/write of body metrics or photos is restricted to:
#   1. The owning client themselves
#   2. That client's own coach (client.coach_id == request.user.id where is_coach)
# No other user, coach, or public endpoint may access this data.
# This data NEVER appears in leaderboard queries, other clients' views,
# or any public-facing serializer.
# ─────────────────────────────────────────────────────────────────────────────

from collections import defaultdict

from rest_framework.parsers import MultiPartParser, FormParser

from .models import (
    MetricDefinition, ClientMetricSubscription,
    BodyMetricEntry, BodyMetricValue, ProgressPhoto,
)
from .serializers import (
    MetricDefinitionSerializer,
    MetricDefinitionInputSerializer,
    ClientMetricSubscriptionSerializer,
    BodyMetricValueSerializer,
    BodyMetricValueInputSerializer,
    SubmitBodyMetricEntryInputSerializer,
    BodyMetricEntrySerializer,
    ProgressPhotoSerializer,
    ProgressPhotoInputSerializer,
    MetricEntriesQuerySerializer,
    MetricPhotosQuerySerializer,
)


def _build_trend_data(entries_qs):
    """
    Transform a queryset of BodyMetricEntry into a dict grouped by
    metric_definition_id with sorted {date, value} arrays — optimized
    for frontend line chart rendering.
    """
    grouped = defaultdict(lambda: {"metric_name": "", "metric_unit": "", "points": []})

    entries = entries_qs.prefetch_related("values__metric_definition").order_by("date")

    for entry in entries:
        for val in entry.values.all():
            md_id = str(val.metric_definition_id)
            bucket = grouped[md_id]
            bucket["metric_name"] = val.metric_definition.name
            bucket["metric_unit"] = val.metric_definition.unit
            bucket["is_default_weight"] = val.metric_definition.is_default_weight
            bucket["points"].append({
                "date": entry.date.isoformat(),
                "value": val.value,
            })

    return grouped


# ── Client-side endpoints ───────────────────────────────────────────────────

class MetricConfigView(APIView):
    """
    GET /api/metrics/config/
    Returns the client's active metric subscriptions (which metrics to show
    in the check-in form) + today's saved values if any, so the form can
    pre-fill for editing.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # Ensure the client's coach has a Weight metric and client is subscribed
        if user.coach_id:
            weight_metric = MetricDefinition.ensure_default_weight(user.coach)
            ClientMetricSubscription.objects.get_or_create(
                client=user, metric_definition=weight_metric,
            )

        subs = (
            ClientMetricSubscription.objects
            .filter(client=user, is_active=True)
            .select_related("metric_definition")
        )

        # Fetch today's values if they exist
        today = timezone.localdate()
        today_entry = (
            BodyMetricEntry.objects
            .filter(user=user, date=today)
            .prefetch_related("values__metric_definition")
            .first()
        )

        today_values = {}
        if today_entry:
            for val in today_entry.values.all():
                today_values[str(val.metric_definition_id)] = val.value

        return Response({
            "subscriptions": ClientMetricSubscriptionSerializer(subs, many=True).data,
            "today_values": today_values,
            "today_date": today.isoformat(),
        })


class BodyMetricEntryView(APIView):
    """
    GET  /api/metrics/entries/?range=90  — client's own entry history for trends
    POST /api/metrics/entries/           — submit/upsert a check-in
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        import datetime
        query_ser = MetricEntriesQuerySerializer(data=request.query_params)
        query_ser.is_valid(raise_exception=True)

        days_range = query_ser.validated_data.get("range", 90)
        end_date = timezone.localdate()
        start_date = end_date - datetime.timedelta(days=days_range - 1)

        entries_qs = BodyMetricEntry.objects.filter(
            user=request.user,
            date__gte=start_date,
            date__lte=end_date,
        )

        trend_data = _build_trend_data(entries_qs)

        return Response({
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "metrics": trend_data,
        })

    @transaction.atomic
    def post(self, request):
        serializer = SubmitBodyMetricEntryInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        date = serializer.validated_data.get("date") or timezone.localdate()
        values_data = serializer.validated_data["values"]

        # Upsert the entry (one per user per date)
        entry, _ = BodyMetricEntry.objects.get_or_create(
            user=request.user,
            date=date,
        )

        # Upsert each value
        for val_item in values_data:
            md_id = val_item["metric_definition_id"]
            try:
                md = MetricDefinition.objects.get(id=md_id)
            except MetricDefinition.DoesNotExist:
                continue

            BodyMetricValue.objects.update_or_create(
                entry=entry,
                metric_definition=md,
                defaults={"value": val_item["value"]},
            )

        # Re-fetch with related data for the response
        entry.refresh_from_db()
        entry_data = BodyMetricEntrySerializer(entry).data
        # Manually prefetch values
        entry_data["values"] = BodyMetricValueSerializer(
            entry.values.select_related("metric_definition"), many=True
        ).data

        return Response(entry_data, status=status.HTTP_200_OK)


class ProgressPhotoListView(APIView):
    """
    GET  /api/metrics/photos/?range=90 — client's own photos in date range
    POST /api/metrics/photos/          — multipart upload (FormData, NOT JSON)
    """
    # POST specifically needs multipart/form-data for file upload —
    # this is the one endpoint in the app that bypasses the standard
    # JSON-only Content-Type used by authedFetch on the frontend.
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        import datetime
        query_ser = MetricPhotosQuerySerializer(data=request.query_params)
        query_ser.is_valid(raise_exception=True)

        days_range = query_ser.validated_data.get("range", 90)
        end_date = timezone.localdate()
        start_date = end_date - datetime.timedelta(days=days_range - 1)

        photos = ProgressPhoto.objects.filter(
            user=request.user,
            date__gte=start_date,
            date__lte=end_date,
        )

        return Response({
            "photos": ProgressPhotoSerializer(photos, many=True, context={"request": request}).data,
        })

    def post(self, request):
        image_file = request.FILES.get("image")
        if not image_file:
            return Response(
                {"error": "No image file provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        date_str = request.data.get("date")
        angle = request.data.get("angle", "")

        if date_str:
            from datetime import date as date_cls
            try:
                photo_date = date_cls.fromisoformat(date_str)
            except (ValueError, TypeError):
                photo_date = timezone.localdate()
        else:
            photo_date = timezone.localdate()

        photo = ProgressPhoto.objects.create(
            user=request.user,
            date=photo_date,
            image=image_file,
            angle=angle if angle in ("front", "side", "back", "other") else "",
        )

        return Response(
            ProgressPhotoSerializer(photo, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class ProgressPhotoDetailView(APIView):
    """DELETE /api/metrics/photos/<uuid:pk>/ — client can delete their own photo."""
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            photo = ProgressPhoto.objects.get(id=pk, user=request.user)
        except ProgressPhoto.DoesNotExist:
            return Response(
                {"error": "Photo not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        photo.image.delete(save=False)  # Delete the actual file
        photo.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Coach-side endpoints ────────────────────────────────────────────────────
# All require IsCoach + ownership check: client.coach_id == request.user.id

class CoachMetricDefinitionListView(APIView):
    """
    GET  /api/coach/metric-definitions/  — coach's full metric library
    POST /api/coach/metric-definitions/  — create a new custom metric type
    """
    permission_classes = [IsCoach]

    def get(self, request):
        # Ensure default Weight metric exists
        MetricDefinition.ensure_default_weight(request.user)
        metrics = MetricDefinition.objects.filter(coach=request.user)
        return Response(MetricDefinitionSerializer(metrics, many=True).data)

    @transaction.atomic
    def post(self, request):
        serializer = MetricDefinitionInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        name = serializer.validated_data["name"].strip()
        unit = serializer.validated_data["unit"].strip()

        if MetricDefinition.objects.filter(coach=request.user, name=name).exists():
            return Response(
                {"error": f"A metric named '{name}' already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        metric = MetricDefinition.objects.create(
            coach=request.user,
            name=name,
            unit=unit,
        )

        return Response(
            MetricDefinitionSerializer(metric).data,
            status=status.HTTP_201_CREATED,
        )


class CoachClientMetricConfigView(APIView):
    """
    GET /api/coach/clients/<uuid:client_id>/metrics/config/
    Returns the client's current metric subscriptions (active + inactive).
    """
    permission_classes = [IsCoach]

    def get(self, request, client_id):
        from django.shortcuts import get_object_or_404
        client = get_object_or_404(request.user.clients.all(), id=client_id)

        subs = (
            ClientMetricSubscription.objects
            .filter(client=client)
            .select_related("metric_definition")
        )

        return Response({
            "subscriptions": ClientMetricSubscriptionSerializer(subs, many=True).data,
        })


class CoachClientMetricSubscriptionView(APIView):
    """
    PATCH /api/coach/clients/<uuid:client_id>/metrics/subscriptions/
    Body: list of {metric_definition_id, is_active}
    Bulk-updates which metrics are enabled for this client.
    """
    permission_classes = [IsCoach]

    @transaction.atomic
    def patch(self, request, client_id):
        from django.shortcuts import get_object_or_404
        client = get_object_or_404(request.user.clients.all(), id=client_id)

        items = request.data
        if not isinstance(items, list):
            return Response(
                {"error": "Expected a list of {metric_definition_id, is_active}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        for item in items:
            md_id = item.get("metric_definition_id")
            is_active = item.get("is_active", True)

            if not md_id:
                continue

            # Verify the metric belongs to this coach
            try:
                md = MetricDefinition.objects.get(id=md_id, coach=request.user)
            except MetricDefinition.DoesNotExist:
                continue

            sub, created = ClientMetricSubscription.objects.get_or_create(
                client=client,
                metric_definition=md,
                defaults={"is_active": is_active},
            )
            if not created and sub.is_active != is_active:
                sub.is_active = is_active
                sub.save(update_fields=["is_active"])

        # Return updated subscriptions
        subs = (
            ClientMetricSubscription.objects
            .filter(client=client)
            .select_related("metric_definition")
        )

        return Response({
            "subscriptions": ClientMetricSubscriptionSerializer(subs, many=True).data,
        })


class CoachClientMetricEntriesView(APIView):
    """
    GET /api/coach/clients/<uuid:client_id>/metrics/entries/?range=90
    Same shape as the client's own endpoint, ownership-checked.
    """
    permission_classes = [IsCoach]

    def get(self, request, client_id):
        import datetime
        from django.shortcuts import get_object_or_404
        client = get_object_or_404(request.user.clients.all(), id=client_id)

        query_ser = MetricEntriesQuerySerializer(data=request.query_params)
        query_ser.is_valid(raise_exception=True)

        days_range = query_ser.validated_data.get("range", 90)
        end_date = timezone.localdate()
        start_date = end_date - datetime.timedelta(days=days_range - 1)

        entries_qs = BodyMetricEntry.objects.filter(
            user=client,
            date__gte=start_date,
            date__lte=end_date,
        )

        trend_data = _build_trend_data(entries_qs)

        return Response({
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "metrics": trend_data,
        })


class CoachClientMetricPhotosView(APIView):
    """
    GET /api/coach/clients/<uuid:client_id>/metrics/photos/?range=90
    Same shape as the client's own endpoint, ownership-checked.
    """
    permission_classes = [IsCoach]

    def get(self, request, client_id):
        import datetime
        from django.shortcuts import get_object_or_404
        client = get_object_or_404(request.user.clients.all(), id=client_id)

        query_ser = MetricPhotosQuerySerializer(data=request.query_params)
        query_ser.is_valid(raise_exception=True)

        days_range = query_ser.validated_data.get("range", 90)
        end_date = timezone.localdate()
        start_date = end_date - datetime.timedelta(days=days_range - 1)

        photos = ProgressPhoto.objects.filter(
            user=client,
            date__gte=start_date,
            date__lte=end_date,
        )

        return Response({
            "photos": ProgressPhotoSerializer(photos, many=True, context={"request": request}).data,
        })


class CoachLeaderboardView(APIView):
    """Coach-only leaderboard: ranks the coach's clients by total XP."""
    permission_classes = [IsCoach]

    def get(self, request):
        from .models import ClientGroup

        serializer = CoachLeaderboardQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        scope = serializer.validated_data.get("scope", "all_time")
        group_id = serializer.validated_data.get("group_id", "")

        group = None
        ungrouped = False

        if scope == "group":
            if group_id == "ungrouped":
                ungrouped = True
            elif group_id:
                try:
                    group = ClientGroup.objects.get(id=group_id, coach=request.user)
                except (ClientGroup.DoesNotExist, ValueError):
                    return Response(
                        {"detail": "Group not found."},
                        status=status.HTTP_404_NOT_FOUND,
                    )

        entries = get_coach_leaderboard(
            coach=request.user, group=group, ungrouped=ungrouped,
        )

        # Include the coach's groups for the frontend group picker
        groups = list(
            ClientGroup.objects.filter(coach=request.user)
            .order_by("name")
            .values("id", "name")
        )
        # Convert UUID to string for JSON
        for g in groups:
            g["id"] = str(g["id"])

        return Response({
            "scope": scope,
            "entries": entries,
            "groups": groups,
        })
