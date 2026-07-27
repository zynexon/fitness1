import math
from datetime import date, timedelta

from django.db import transaction
from django.db.models import DateField
from django.db.models import Count
from django.db.models import Prefetch
from django.db.models import Q
from django.db.models import Sum
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError

from .models import DailyChallenge, DailyChallengeCompletion, DailyTaskSet, GameSession, JournalEntry, Task, User, UserTask, XPLog


MAX_DAILY_GAME_XP = 50
WAR_MODE_XP_BY_DURATION = {
    "skirmish": 30,
    "battle": 60,
    "full_war": 100,
}
WAR_MODE_DURATION_BY_GAME_TYPE = {
    "war_mode_skirmish": "skirmish",
    "war_mode_battle": "battle",
    "war_mode_full_war": "full_war",
}
WAR_MODE_GAME_TYPES = tuple(WAR_MODE_DURATION_BY_GAME_TYPE.keys())
MAX_DAILY_GAME_XP_BY_TYPE = {
    "quick_math": 50,
    "focus_tap": 50,
    "reaction_tap": 50,
    "number_recall": 50,
    "color_count_focus": 60,
    "speed_pattern": 100,
    "reverse_order": 75,
    "number_stack": 75,
    "logic_grid": 100,
    "pattern_sequence": 80,
}
DAILY_TASK_COUNT = 5
TASK_XP_AMOUNT = 20
XP_ELIGIBLE_TASK_COUNT = 5
CUSTOM_TASK_PREFIX = "__custom__:"
MAX_STREAK_SHIELDS = 3
XP_SHIELD_MILESTONE = 500
GAME_MIN_DURATION_SECONDS = 20
GAME_MAX_DURATION_SECONDS = 120
GAME_MIN_DURATION_SECONDS_BY_TYPE = {
    "quick_math": 20,
    "focus_tap": 5,
    "reaction_tap": 7,
    "number_recall": 2,
    "color_count_focus": 6,
    "speed_pattern": 2,
    "reverse_order": 0,
    "number_stack": 0,
    "logic_grid": 30,
    "pattern_sequence": 15,
    "war_mode_skirmish": 1400,
    "war_mode_battle": 2600,
    "war_mode_full_war": 3500,
}
GAME_MAX_DURATION_SECONDS_BY_TYPE = {
    "quick_math": 120,
    "focus_tap": 180,
    "reaction_tap": 300,
    "number_recall": 180,
    "color_count_focus": 180,
    "speed_pattern": 300,
    "reverse_order": 600,
    "number_stack": 600,
    "logic_grid": 900,
    "pattern_sequence": 600,
    "war_mode_skirmish": 2400,
    "war_mode_battle": 4200,
    "war_mode_full_war": 5400,
}
GAME_MAX_SCORE_BY_TYPE = {
    "quick_math": 60,
    "focus_tap": 15,
    "reaction_tap": 1,
    "number_recall": 1,
    "color_count_focus": 8,
    "speed_pattern": 1,
    "reverse_order": 1,
    "number_stack": 1,
    "logic_grid": 1,
    "pattern_sequence": 9,
    "war_mode_skirmish": 1,
    "war_mode_battle": 1,
    "war_mode_full_war": 1,
}
FOCUS_TAP_WIN_SCORE = 15
REACTION_TAP_WIN_SCORE = 1
NUMBER_RECALL_WIN_SCORE = 1
COLOR_COUNT_FOCUS_WIN_SCORE = 8
SPEED_PATTERN_WIN_SCORE = 1
LOGIC_GRID_WIN_SCORE = 1
GAME_XP_PER_SCORE = 2
GAME_XP_PER_SESSION_CAP = 30
FOCUS_CATEGORIES = [
    User.FOCUS_STUDY,
    User.FOCUS_FITNESS,
    User.FOCUS_DISCIPLINE,
    User.FOCUS_WORK,
    User.FOCUS_LOGIC,
]
DEFAULT_TASK_TEMPLATES = [
    # Study / Learning
    {"title": "Lock in. 45 minutes. No excuses.", "xp": 20, "category": "study"},
    {"title": "Feed your mind. 10 pages minimum.", "xp": 10, "category": "study"},
    {"title": "Grow or decay. 15 mins of real learning.", "xp": 10, "category": "study"},
    {"title": "Study/work 60 minutes distraction-free.", "xp": 20, "category": "study"},
    {"title": "Write 5 key learnings from today.", "xp": 10, "category": "study"},
    {"title": "Teach someone what you learned today.", "xp": 15, "category": "study"},
    {"title": "Review yesterday's notes for 10 minutes.", "xp": 10, "category": "study"},
    {"title": "No phone for first 30 mins of study.", "xp": 15, "category": "study"},
    {"title": "Complete one hard problem you've been avoiding.", "xp": 25, "category": "study"},
    {"title": "Write a summary of what you studied today.", "xp": 10, "category": "study"},

    # Fitness
    {"title": "Train the body. The mind follows.", "xp": 25, "category": "fitness"},
    {"title": "Do 50 push-ups (or equivalent).", "xp": 20, "category": "fitness"},
    {"title": "Fuel the machine. 2L of water. No negotiation.", "xp": 10, "category": "fitness"},
    {"title": "Avoid junk food today.", "xp": 15, "category": "fitness"},
    {"title": "30-minute walk. No excuses.", "xp": 15, "category": "fitness"},
    {"title": "Sleep before 11 PM. Recovery is part of war.", "xp": 20, "category": "fitness"},
    {"title": "No sugar for the entire day.", "xp": 20, "category": "fitness"},
    {"title": "5-minute cold shower. Do it.", "xp": 15, "category": "fitness"},
    {"title": "Stretch for 10 minutes.", "xp": 10, "category": "fitness"},
    {"title": "Track your calories today.", "xp": 10, "category": "fitness"},

    # Discipline / Focus
    {"title": "Don't let the feed steal your morning.", "xp": 15, "category": "discipline"},
    {"title": "Silence the noise. 10 minutes of stillness.", "xp": 15, "category": "discipline"},
    {"title": "No social media after 9 PM.", "xp": 15, "category": "discipline"},
    {"title": "Own the morning before the world wakes up.", "xp": 15, "category": "discipline"},
    {"title": "Winners plan tonight. Losers react tomorrow.", "xp": 10, "category": "discipline"},
    {"title": "Do one thing you've been avoiding all week.", "xp": 25, "category": "discipline"},
    {"title": "No complaints for the entire day.", "xp": 20, "category": "discipline"},
    {"title": "Write your goals for the week.", "xp": 15, "category": "discipline"},
    {"title": "Single task for 1 hour. No switching.", "xp": 20, "category": "discipline"},
    {"title": "Spend 0 minutes on short-form video today.", "xp": 20, "category": "discipline"},

    # Work / Productivity
    {"title": "Chaotic desk. Chaotic mind. Fix it.", "xp": 10, "category": "work"},
    {"title": "Know where your money goes. Track expenses.", "xp": 10, "category": "work"},
    {"title": "Unclear goals = guaranteed failure. Write them down.", "xp": 15, "category": "work"},
    {"title": "Complete your 3 most important tasks today.", "xp": 25, "category": "work"},
    {"title": "Reply to every pending message before noon.", "xp": 15, "category": "work"},
    {"title": "Do a full weekly review in 15 minutes.", "xp": 15, "category": "work"},
    {"title": "Identify one task to eliminate or delegate.", "xp": 10, "category": "work"},
    {"title": "Deep work block: 90 minutes, zero interruptions.", "xp": 25, "category": "work"},
    {"title": "Set a hard stop time and stick to it.", "xp": 10, "category": "work"},
    {"title": "Send one email you've been putting off.", "xp": 10, "category": "work"},

    # Logic
    {"title": "Solve one logic puzzle or brain teaser.", "xp": 15, "category": "logic"},
    {"title": "Play one full round of a strategy game.", "xp": 15, "category": "logic"},
    {"title": "Read about a topic completely outside your field.", "xp": 10, "category": "logic"},
    {"title": "Write down 3 assumptions you currently hold and challenge them.", "xp": 15, "category": "logic"},
    {"title": "Explain a complex concept to yourself simply.", "xp": 10, "category": "logic"},
    {"title": "Identify one cognitive bias you fell for this week.", "xp": 15, "category": "logic"},
    {"title": "Do mental math for all calculations today.", "xp": 10, "category": "logic"},
    {"title": "Write a pros/cons list for a decision you're avoiding.", "xp": 10, "category": "logic"},
    {"title": "Spend 20 minutes on a coding or math challenge.", "xp": 20, "category": "logic"},
    {"title": "Debate both sides of an argument in your journal.", "xp": 15, "category": "logic"},
]
DAILY_CHALLENGE_XP_REWARD = 30
DAILY_CHALLENGE_POOL = [
    {
        "type": DailyChallenge.TYPE_COMPLETE_3_TASKS,
        "description": "Complete 3 tasks today",
        "target": 3,
    },
    {
        "type": DailyChallenge.TYPE_EARN_20_XP_FROM_GAMES,
        "description": "Earn 20 XP from games",
        "target": 20,
    },
    {
        "type": DailyChallenge.TYPE_WRITE_JOURNAL_ENTRY,
        "description": "Write your journal entry",
        "target": 1,
    },
    {
        "type": DailyChallenge.TYPE_COMPLETE_MORNING_TASK,
        "description": "Complete a task before 10:00 AM",
        "target": 1,
    },
]


def get_user(user_id):
    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist as exc:
        raise NotFound("User not found.") from exc


def get_user_task(user_task_id, for_update=False):
    query = UserTask.objects.select_related("task", "user")
    if for_update:
        query = query.select_for_update()

    try:
        return query.get(id=user_task_id)
    except UserTask.DoesNotExist as exc:
        raise NotFound("User task not found.") from exc


def get_game_session(session_id, user, for_update=False):
    query = GameSession.objects.filter(id=session_id, user=user)
    if for_update:
        query = query.select_for_update()

    session = query.first()
    if not session:
        raise NotFound("Game session not found.")
    return session


def calculate_level(xp):
    return max(1, int(math.sqrt(max(0, xp) / 50)))


def increment_user_xp(user, amount):
    if amount <= 0:
        raise ValidationError("XP amount must be positive.")

    previous_xp = user.xp
    user.xp += amount
    user.level = calculate_level(user.xp)
    milestones_crossed = (user.xp // XP_SHIELD_MILESTONE) - (previous_xp // XP_SHIELD_MILESTONE)
    milestone_shields_awarded = 0
    if milestones_crossed > 0:
        milestone_shields_awarded = grant_streak_shields(user, milestones_crossed)

    update_fields = ["xp", "level"]
    if milestone_shields_awarded > 0:
        update_fields.append("streak_shields")

    user.save(update_fields=update_fields)
    return milestone_shields_awarded


def transfer_xp_wager(from_user, to_user, amount):
    """
    Transfer XP wager from loser to winner.

    This bypasses daily game XP caps entirely — wager XP is a direct
    balance transfer, not a game reward. No streak shields are granted.
    Both sides are logged with SOURCE_WAGER for audit trail.
    """
    if amount <= 0:
        return 0

    # Cap deduction at what the loser actually has (can't go below 0)
    available = max(0, from_user.xp or 0)
    actual = min(amount, available)

    if actual <= 0:
        return 0

    # Deduct from loser — direct save, no shields, no level-up side effects
    from_user.xp = max(0, available - actual)
    from_user.level = calculate_level(from_user.xp)
    from_user.save(update_fields=["xp", "level"])

    # Log the deduction for the loser
    XPLog.objects.create(
        user=from_user,
        source=XPLog.SOURCE_WAGER,
        amount=-actual,  # negative = lost XP
    )

    # Credit winner — direct save, no shields, no daily cap check
    to_user.xp = (to_user.xp or 0) + actual
    to_user.level = calculate_level(to_user.xp)
    to_user.save(update_fields=["xp", "level"])

    # Log the credit for the winner
    XPLog.objects.create(
        user=to_user,
        source=XPLog.SOURCE_WAGER,
        amount=actual,  # positive = gained XP
    )

    return actual


def create_xp_log(user, source, amount):
    return XPLog.objects.create(user=user, source=source, amount=amount)


def grant_streak_shields(user, amount=1):
    if amount <= 0:
        return 0

    current = max(0, user.streak_shields or 0)
    next_value = min(MAX_STREAK_SHIELDS, current + amount)
    granted = next_value - current
    user.streak_shields = next_value
    return granted


def award_shield_for_perfect_week(user, reference_date=None):
    target_date = reference_date or timezone.localdate()
    week_start = target_date - timezone.timedelta(days=6)

    if user.last_perfect_week_shield_date:
        days_since_last_award = (target_date - user.last_perfect_week_shield_date).days
        if days_since_last_award < 7:
            return 0

    completed_counts = {
        row["date"]: row["total"]
        for row in UserTask.objects.filter(
            user=user,
            date__gte=week_start,
            date__lte=target_date,
            completed=True,
        )
        .values("date")
        .annotate(total=Count("id"))
    }

    for offset in range(7):
        day = week_start + timezone.timedelta(days=offset)
        if completed_counts.get(day, 0) < DAILY_TASK_COUNT:
            return 0

    granted = grant_streak_shields(user, 1)
    if granted > 0:
        user.last_perfect_week_shield_date = target_date
    return granted


def check_streak_on_login(user, today=None):
    target_day = today or timezone.localdate()
    yesterday = target_day - timezone.timedelta(days=1)
    update_fields = []

    if user.shield_used_today and user.last_active_date != target_day:
        user.shield_used_today = False
        update_fields.append("shield_used_today")

    if not user.last_active_date:
        if update_fields:
            user.save(update_fields=list(dict.fromkeys(update_fields)))
        return user

    gap_days = (target_day - user.last_active_date).days
    if gap_days <= 1:
        if update_fields:
            user.save(update_fields=list(dict.fromkeys(update_fields)))
        return user

    if gap_days == 2 and (user.streak_shields or 0) > 0:
        user.streak_shields -= 1
        user.shield_used_today = True
        user.streak += 1
        user.last_active_date = target_day
        update_fields.extend(["streak_shields", "shield_used_today", "streak", "last_active_date"])
    else:
        user.streak = 0
        user.last_active_date = yesterday
        update_fields.extend(["streak", "last_active_date"])

    user.save(update_fields=list(dict.fromkeys(update_fields)))
    return user


def update_streak(user):
    today = timezone.localdate()
    yesterday = today - timezone.timedelta(days=1)

    if user.last_active_date == today:
        if (user.streak or 0) == 0:
            user.streak = 1
            user.save(update_fields=["streak"])
        return user

    if user.last_active_date == yesterday:
        user.streak += 1
    else:
        user.streak = 1

    user.last_active_date = today
    user.save(update_fields=["streak", "last_active_date"])
    return user


def get_daily_game_xp_cap(game_type):
    if game_type in WAR_MODE_GAME_TYPES:
        return None

    cap = MAX_DAILY_GAME_XP_BY_TYPE.get(game_type)
    if cap is None:
        raise ValidationError("Invalid game type.")
    return cap


def get_today_game_xp(user, game_type):
    today = timezone.localdate()
    query = GameSession.objects.filter(
        user=user,
        ended_at__date=today,
    )

    if game_type in WAR_MODE_GAME_TYPES:
        query = query.filter(game_type__in=WAR_MODE_GAME_TYPES)
    else:
        query = query.filter(game_type=game_type)

    result = query.aggregate(total=Sum("xp_awarded"))
    return result["total"] or 0


def get_daily_game_remaining_by_type(user):
    today = timezone.localdate()
    xp_by_type = dict(
        GameSession.objects.filter(
            user=user,
            ended_at__date=today,
            game_type__in=MAX_DAILY_GAME_XP_BY_TYPE.keys(),
        )
        .values("game_type")
        .annotate(total=Coalesce(Sum("xp_awarded"), 0))
        .values_list("game_type", "total")
    )

    return {
        game_type: {
            "daily_cap": daily_cap,
            "remaining_today": max(0, daily_cap - (xp_by_type.get(game_type, 0) or 0)),
        }
        for game_type, daily_cap in MAX_DAILY_GAME_XP_BY_TYPE.items()
    }


def calculate_game_session_xp(score):
    return min(score * GAME_XP_PER_SCORE, GAME_XP_PER_SESSION_CAP)


def validate_game_score(game_type, score):
    max_score = GAME_MAX_SCORE_BY_TYPE.get(game_type)
    if max_score is None:
        raise ValidationError("Invalid game type.")

    if score < 0 or score > max_score:
        raise ValidationError("Invalid score submitted.")


def validate_game_duration(game_type, duration_seconds):
    min_duration = GAME_MIN_DURATION_SECONDS_BY_TYPE.get(game_type)
    max_duration = GAME_MAX_DURATION_SECONDS_BY_TYPE.get(game_type)

    if min_duration is None or max_duration is None:
        raise ValidationError("Invalid game type.")

    if duration_seconds < min_duration:
        raise ValidationError("Game submitted too quickly.")

    if duration_seconds > max_duration:
        raise ValidationError("Game session expired.")


def calculate_game_session_xp_for_type(game_type, score):
    if game_type == "reverse_order":
        return 15 if score >= 1 else 0

    if game_type == "number_stack":
        return 15 if score >= 1 else 0

    if game_type == "logic_grid":
        return 25 if score >= LOGIC_GRID_WIN_SCORE else 0

    if game_type == "pattern_sequence":
        return 20

    if game_type == "reaction_tap":
        return 10 if score >= REACTION_TAP_WIN_SCORE else 0

    if game_type in WAR_MODE_DURATION_BY_GAME_TYPE:
        duration_key = WAR_MODE_DURATION_BY_GAME_TYPE[game_type]
        return WAR_MODE_XP_BY_DURATION[duration_key]

    if game_type == "focus_tap":
        return 10 if score >= FOCUS_TAP_WIN_SCORE else 0

    if game_type == "number_recall":
        return 10 if score >= NUMBER_RECALL_WIN_SCORE else 0

    if game_type == "color_count_focus":
        return 12 if score >= COLOR_COUNT_FOCUS_WIN_SCORE else 0

    if game_type == "speed_pattern":
        return 25 if score >= SPEED_PATTERN_WIN_SCORE else 0

    return calculate_game_session_xp(score)


def get_today_completed_task_count(user, target_date=None):
    today = target_date or timezone.localdate()
    return UserTask.objects.filter(
        user=user,
        date=today,
        completed=True,
    ).count()


def seed_task_templates():
    created_count = 0
    for template in DEFAULT_TASK_TEMPLATES:
        legacy_title = template.get("legacy_title")
        category = template.get("category", Task.CATEGORY_GENERAL)
        if legacy_title:
            Task.objects.filter(title=legacy_title).update(
                title=template["title"],
                xp=template["xp"],
                category=category,
            )

        _, created = Task.objects.update_or_create(
            title=template["title"],
            defaults={
                "xp": template["xp"],
                "category": category,
            },
        )
        if created:
            created_count += 1
    return created_count


def get_or_create_daily_task_set(target_date=None, category=Task.CATEGORY_GENERAL):
    if target_date is None:
        target_date = timezone.localdate()

    if category not in FOCUS_CATEGORIES:
        category = Task.CATEGORY_GENERAL

    if Task.objects.exclude(title__startswith=CUSTOM_TASK_PREFIX).count() < DAILY_TASK_COUNT:
        seed_task_templates()

    daily_set, created = DailyTaskSet.objects.get_or_create(
        date=target_date,
        category=category,
    )

    if created:
        available_tasks = list(
            Task.objects.filter(category=category)
            .exclude(title__startswith=CUSTOM_TASK_PREFIX)
            .order_by("?")[:DAILY_TASK_COUNT]
        )
        if len(available_tasks) < DAILY_TASK_COUNT:
            available_tasks = list(
                Task.objects.exclude(title__startswith=CUSTOM_TASK_PREFIX)
                .order_by("?")[:DAILY_TASK_COUNT]
            )
        if len(available_tasks) < DAILY_TASK_COUNT:
            raise ValidationError(
                f"Not enough tasks available. Need {DAILY_TASK_COUNT}, found {len(available_tasks)}."
            )
        daily_set.tasks.set(available_tasks)

    return daily_set


def assign_daily_tasks(user, date=None):
    target_date = date or timezone.localdate()
    category = user.focus_category or User.FOCUS_DISCIPLINE
    daily_set = get_or_create_daily_task_set(target_date, category)

    existing_user_tasks = list(
        UserTask.objects.filter(user=user, date=target_date).select_related("task")
    )
    existing_task_ids = {user_task.task_id for user_task in existing_user_tasks}
    slots_remaining = max(0, DAILY_TASK_COUNT - len(existing_user_tasks))

    if slots_remaining == 0:
        return existing_user_tasks, 0

    candidate_tasks = list(
        daily_set.tasks.exclude(id__in=existing_task_ids)
        .exclude(title__startswith=CUSTOM_TASK_PREFIX)
    )
    if len(candidate_tasks) < slots_remaining:
        fallback_tasks = list(
            Task.objects.filter(category=category)
            .exclude(id__in=existing_task_ids)
            .exclude(title__startswith=CUSTOM_TASK_PREFIX)
            .order_by("?")
        )
        seen_ids = {task.id for task in candidate_tasks}
        for task in fallback_tasks:
            if task.id in seen_ids:
                continue
            candidate_tasks.append(task)
            seen_ids.add(task.id)

    if len(candidate_tasks) < slots_remaining:
        fallback_all = list(
            Task.objects.exclude(id__in=existing_task_ids)
            .exclude(title__startswith=CUSTOM_TASK_PREFIX)
            .order_by("?")
        )
        seen_ids = {task.id for task in candidate_tasks}
        for task in fallback_all:
            if task.id in seen_ids:
                continue
            candidate_tasks.append(task)
            seen_ids.add(task.id)

    created_count = 0
    for task in candidate_tasks:
        if created_count >= slots_remaining:
            break
        user_task, created = UserTask.objects.get_or_create(
            user=user,
            task=task,
            date=target_date,
            defaults={"completed": False},
        )
        if created:
            created_count += 1

    assigned = list(
        UserTask.objects.filter(user=user, date=target_date).select_related("task")
    )
    return assigned, created_count


def get_daily_tasks(user, date=None):
    target_date = date or timezone.localdate()

    user_tasks = UserTask.objects.filter(
        user=user,
        date=target_date,
    ).select_related("task")

    if not user_tasks.exists():
        assigned, _ = assign_daily_tasks(user, target_date)
        user_tasks = assigned
    else:
        user_tasks = list(user_tasks)

    return user_tasks


def get_or_create_today_challenge(target_date=None):
    challenge_date = target_date or timezone.localdate()
    day_of_year = challenge_date.timetuple().tm_yday
    template = DAILY_CHALLENGE_POOL[(day_of_year - 1) % len(DAILY_CHALLENGE_POOL)]

    challenge, _ = DailyChallenge.objects.get_or_create(
        date=challenge_date,
        defaults={
            "challenge_type": template["type"],
            "description": template["description"],
            "target_value": template["target"],
            "reward_xp": DAILY_CHALLENGE_XP_REWARD,
        },
    )
    return challenge


def get_challenge_progress(user, challenge):
    challenge_date = challenge.date
    target = max(1, challenge.target_value)
    current = 0

    if challenge.challenge_type == DailyChallenge.TYPE_COMPLETE_3_TASKS:
        current = UserTask.objects.filter(
            user=user,
            date=challenge_date,
            completed=True,
        ).count()
    elif challenge.challenge_type == DailyChallenge.TYPE_EARN_20_XP_FROM_GAMES:
        current = (
            XPLog.objects.filter(
                user=user,
                source=XPLog.SOURCE_GAME,
                created_at__date=challenge_date,
            ).aggregate(total=Coalesce(Sum("amount"), 0))["total"]
            or 0
        )
    elif challenge.challenge_type == DailyChallenge.TYPE_WRITE_JOURNAL_ENTRY:
        current = 1 if JournalEntry.objects.filter(user=user, date=challenge_date).exists() else 0
    elif challenge.challenge_type == DailyChallenge.TYPE_COMPLETE_MORNING_TASK:
        tasks_today = UserTask.objects.filter(
            user=user,
            date=challenge_date,
            completed=True,
            completed_at__isnull=False,
        )

        for user_task in tasks_today:
            completed_local = timezone.localtime(user_task.completed_at)
            if completed_local.date() == challenge_date and completed_local.hour < 10:
                current += 1

    return {
        "current": int(current),
        "target": int(target),
        "completed": int(current) >= int(target),
    }


def _build_daily_challenge_payload(
    challenge,
    progress,
    completion,
    xp_awarded_now=0,
    xp_milestone_shields_awarded=0,
):
    normalized_progress = {
        "current": int(progress.get("current", 0)),
        "target": int(progress.get("target", challenge.target_value)),
        "completed": bool(progress.get("completed", False)),
    }

    if completion:
        normalized_progress["current"] = max(normalized_progress["current"], normalized_progress["target"])
        normalized_progress["completed"] = True

    return {
        "challenge": {
            "id": str(challenge.id),
            "date": challenge.date.isoformat(),
            "type": challenge.challenge_type,
            "description": challenge.description,
            "target_value": challenge.target_value,
            "reward_xp": challenge.reward_xp,
        },
        "progress": normalized_progress,
        "completed": bool(completion),
        "completed_at": completion.completed_at.isoformat() if completion else None,
        "xp_awarded_now": int(xp_awarded_now),
        "xp_milestone_shields_awarded": int(xp_milestone_shields_awarded),
    }


def get_daily_challenge_status(user):
    challenge = get_or_create_today_challenge()
    progress = get_challenge_progress(user, challenge)
    completion = DailyChallengeCompletion.objects.filter(user=user, challenge=challenge).first()
    return _build_daily_challenge_payload(challenge, progress, completion)


def check_and_award_daily_challenge(user):
    challenge = get_or_create_today_challenge()
    progress = get_challenge_progress(user, challenge)
    existing_completion = DailyChallengeCompletion.objects.filter(user=user, challenge=challenge).first()

    if existing_completion:
        return _build_daily_challenge_payload(challenge, progress, existing_completion)

    if not progress["completed"]:
        return _build_daily_challenge_payload(challenge, progress, completion=None)

    xp_awarded_now = 0
    xp_milestone_shields_awarded = 0

    with transaction.atomic():
        challenge = DailyChallenge.objects.select_for_update().get(id=challenge.id)
        completion, created = DailyChallengeCompletion.objects.get_or_create(
            user=user,
            challenge=challenge,
        )

        if created:
            locked_user = User.objects.select_for_update().get(id=user.id)
            xp_awarded_now = challenge.reward_xp
            xp_milestone_shields_awarded = increment_user_xp(locked_user, xp_awarded_now)
            create_xp_log(locked_user, XPLog.SOURCE_DAILY_CHALLENGE, xp_awarded_now)

            user.xp = locked_user.xp
            user.level = locked_user.level
            user.streak_shields = locked_user.streak_shields
        else:
            xp_awarded_now = 0
            xp_milestone_shields_awarded = 0

    updated_progress = get_challenge_progress(user, challenge)
    completion = DailyChallengeCompletion.objects.filter(user=user, challenge=challenge).first()

    return _build_daily_challenge_payload(
        challenge,
        updated_progress,
        completion,
        xp_awarded_now=xp_awarded_now,
        xp_milestone_shields_awarded=xp_milestone_shields_awarded,
    )


def get_weekly_leaderboard_window(reference_time=None):
    now = reference_time or timezone.localtime()
    week_start = (now - timezone.timedelta(days=now.weekday())).replace(
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )
    week_end = week_start + timezone.timedelta(days=7)
    return week_start, week_end


def get_leaderboard(current_user=None, limit=20, period="weekly"):
    from .models import UserArtifact

    is_weekly = period == "weekly"
    equipped_artifacts = Prefetch(
        "user_artifacts",
        queryset=UserArtifact.objects.select_related("artifact").filter(is_equipped=True),
        to_attr="equipped_artifacts",
    )
    users_query = User.objects.annotate(
        recent_activity=Coalesce("last_active_date", date(1970, 1, 1), output_field=DateField()),
    )
    users_query = users_query.prefetch_related(equipped_artifacts)
    previous_rank_by_user_id = {}

    if is_weekly:
        week_start, week_end = get_weekly_leaderboard_window()
        today_start = timezone.localtime().replace(hour=0, minute=0, second=0, microsecond=0)
        users_query = users_query.annotate(
            weekly_xp=Coalesce(
                Sum(
                    "xp_logs__amount",
                    filter=Q(
                        xp_logs__created_at__gte=week_start,
                        xp_logs__created_at__lt=week_end,
                        # Exclude negative wager amounts from weekly XP leaderboard
                        xp_logs__amount__gt=0,
                    ),
                ),
                0,
            )
        ).order_by("-weekly_xp", "-streak", "-recent_activity", "created_at")

        previous_users = list(
            User.objects.annotate(
                recent_activity=Coalesce("last_active_date", date(1970, 1, 1), output_field=DateField()),
            )
            .annotate(
                weekly_xp=Coalesce(
                    Sum(
                        "xp_logs__amount",
                        filter=Q(
                            xp_logs__created_at__gte=week_start,
                            xp_logs__created_at__lt=today_start,
                            xp_logs__amount__gt=0,
                        ),
                    ),
                    0,
                )
            )
            .order_by("-weekly_xp", "-streak", "-recent_activity", "created_at")
        )
        previous_rank_by_user_id = {
            user.id: index
            for index, user in enumerate(previous_users, start=1)
        }
    else:
        users_query = users_query.order_by("-xp", "-streak", "-recent_activity", "created_at")

    users = list(users_query)

    total_users = len(users)

    entries = []
    current_user_rank = None
    for index, user in enumerate(users, start=1):
        previous_rank = previous_rank_by_user_id.get(user.id)
        rank_change = (previous_rank - index) if previous_rank is not None else 0

        equipped_artifact = user.equipped_artifacts[0] if getattr(user, "equipped_artifacts", []) else None
        equipped_payload = None
        if equipped_artifact:
            artifact = equipped_artifact.artifact
            equipped_payload = {
                "id": str(artifact.id),
                "slug": artifact.slug,
                "name": artifact.name,
                "icon_key": artifact.icon_key,
                "rarity": artifact.rarity,
                "color_primary": artifact.color_primary,
                "color_secondary": artifact.color_secondary,
            }

        entry = {
            "rank": index,
            "user_id": str(user.id),
            "name": user.name,
            "email": user.email,
            "xp": user.xp,
            "weekly_xp": int(getattr(user, "weekly_xp", 0)) if is_weekly else None,
            "rank_change": rank_change if is_weekly else None,
            "level": user.level,
            "streak": user.streak,
            "equipped_badge": user.equipped_badge,
            "equipped_artifact": equipped_payload,
            "last_active_date": user.last_active_date,
            "is_current_user": bool(current_user) and user.id == current_user.id,
        }

        if entry["is_current_user"]:
            current_user_rank = entry

        if len(entries) < limit:
            entries.append(entry)

    return entries, current_user_rank, total_users


def get_prestige_leaderboard(current_user=None, limit=50):
    from .models import UserArtifact

    equipped_artifacts = Prefetch(
        "user_artifacts",
        queryset=UserArtifact.objects.select_related("artifact").filter(is_equipped=True),
        to_attr="equipped_artifacts",
    )
    prestige_artifacts = Prefetch(
        "user_artifacts",
        queryset=(
            UserArtifact.objects.select_related("artifact")
            .filter(artifact__unlock_condition__startswith="prestige_")
            .order_by("-earned_at")
        ),
        to_attr="prestige_artifacts",
    )

    users_query = (
        User.objects.filter(prestige_level__gt=0)
        .prefetch_related(prestige_artifacts, equipped_artifacts)
        .annotate(
            recent_activity=Coalesce(
                "last_active_date", date(1970, 1, 1), output_field=DateField()
            ),
        )
        .order_by("-prestige_level", "-xp", "-streak", "-recent_activity", "created_at")
    )

    users = list(users_query)
    total_users = len(users)
    entries = []
    current_user_rank = None

    for index, user in enumerate(users, start=1):
        prestige_artifact = user.prestige_artifacts[0] if getattr(user, "prestige_artifacts", []) else None
        equipped_artifact = user.equipped_artifacts[0] if getattr(user, "equipped_artifacts", []) else None
        equipped_payload = None
        if equipped_artifact:
            artifact = equipped_artifact.artifact
            equipped_payload = {
                "id": str(artifact.id),
                "slug": artifact.slug,
                "name": artifact.name,
                "icon_key": artifact.icon_key,
                "rarity": artifact.rarity,
                "color_primary": artifact.color_primary,
                "color_secondary": artifact.color_secondary,
            }
        entry = {
            "rank": index,
            "user_id": str(user.id),
            "name": user.name,
            "email": user.email,
            "xp": user.xp,
            "total_xp": user.xp,
            "level": user.level,
            "streak": user.streak,
            "prestige_level": user.prestige_level,
            "equipped_badge": user.equipped_badge,
            "equipped_artifact": equipped_payload,
            "season_label": prestige_artifact.season_label if prestige_artifact else "",
            "last_active_date": user.last_active_date,
            "is_current_user": bool(current_user) and user.id == current_user.id,
        }

        if entry["is_current_user"]:
            current_user_rank = entry

        if len(entries) < limit:
            entries.append(entry)

    return entries, current_user_rank, total_users


def get_weekly_war_report(user, reference_date=None):
    today = reference_date or timezone.localdate()
    days_since_sunday = (today.weekday() + 1) % 7
    week_end_date = today - timedelta(days=days_since_sunday)
    week_start_date = week_end_date - timedelta(days=6)

    week_start_dt = timezone.make_aware(
        timezone.datetime.combine(week_start_date, timezone.datetime.min.time())
    )
    week_end_dt = timezone.make_aware(
        timezone.datetime.combine(week_end_date, timezone.datetime.max.time())
    )

    xp_logs = XPLog.objects.filter(
        user=user,
        created_at__gte=week_start_dt,
        created_at__lte=week_end_dt,
    )
    total_xp_earned = xp_logs.filter(amount__gt=0).aggregate(total=Coalesce(Sum("amount"), 0))["total"]
    xp_from_tasks = xp_logs.filter(source=XPLog.SOURCE_TASK).aggregate(t=Coalesce(Sum("amount"), 0))["t"]
    xp_from_games = xp_logs.filter(source=XPLog.SOURCE_GAME).aggregate(t=Coalesce(Sum("amount"), 0))["t"]
    xp_from_journal = xp_logs.filter(source=XPLog.SOURCE_JOURNAL).aggregate(t=Coalesce(Sum("amount"), 0))["t"]
    xp_from_challenges = xp_logs.filter(source=XPLog.SOURCE_DAILY_CHALLENGE).aggregate(t=Coalesce(Sum("amount"), 0))["t"]

    tasks_this_week = UserTask.objects.filter(
        user=user,
        date__gte=week_start_date,
        date__lte=week_end_date,
        completed=True,
    ).count()

    active_days = UserTask.objects.filter(
        user=user,
        date__gte=week_start_date,
        date__lte=week_end_date,
        completed=True,
    ).values("date").distinct().count()

    sessions = GameSession.objects.filter(
        user=user,
        ended_at__gte=week_start_dt,
        ended_at__lte=week_end_dt,
        ended_at__isnull=False,
    )
    games_played = sessions.count()
    game_type_breakdown = list(
        sessions.values("game_type")
        .annotate(count=Count("id"))
        .order_by("-count")[:3]
    )

    journal_entries = JournalEntry.objects.filter(
        user=user,
        date__gte=week_start_date,
        date__lte=week_end_date,
    ).count()

    _, current_user_rank, total_users = get_leaderboard(user, limit=200, period="weekly")
    current_rank = current_user_rank["rank"] if current_user_rank else None

    task_score = min(40, round(tasks_this_week / 35 * 40))
    game_score = min(30, round(games_played / 14 * 30))
    journal_score = min(20, round(journal_entries / 7 * 20))
    xp_score = min(10, round(total_xp_earned / 500 * 10))
    performance = task_score + game_score + journal_score + xp_score

    if performance >= 90:
        grade, verdict = "S", "Legendary week. You showed up every day."
    elif performance >= 75:
        grade, verdict = "A", "Strong week. The discipline is building."
    elif performance >= 55:
        grade, verdict = "B", "Decent week. More to give next time."
    elif performance >= 35:
        grade, verdict = "C", "You survived. Now come back harder."
    else:
        grade, verdict = "D", "You lost this week. Win the next one."

    return {
        "week_start": week_start_date.isoformat(),
        "week_end": week_end_date.isoformat(),
        "total_xp_earned": total_xp_earned,
        "xp_from_tasks": xp_from_tasks,
        "xp_from_games": xp_from_games,
        "xp_from_journal": xp_from_journal,
        "xp_from_challenges": xp_from_challenges,
        "tasks_completed": tasks_this_week,
        "active_days": active_days,
        "games_played": games_played,
        "game_type_breakdown": game_type_breakdown,
        "journal_entries": journal_entries,
        "current_rank": current_rank,
        "total_users": total_users,
        "performance_score": performance,
        "grade": grade,
        "verdict": verdict,
        "current_xp": user.xp,
        "current_level": user.level,
        "current_streak": user.streak,
    }


def get_user_stats(user):
    total_tasks = UserTask.objects.filter(
        user=user,
        completed=True,
    ).count()

    war_sessions = GameSession.objects.filter(
        user=user,
        game_type__in=WAR_MODE_GAME_TYPES,
        ended_at__isnull=False,
        xp_awarded__gt=0,
    ).count()

    full_war_sessions = GameSession.objects.filter(
        user=user,
        game_type="war_mode_full_war",
        ended_at__isnull=False,
        xp_awarded__gt=0,
    ).count()

    journal_count = JournalEntry.objects.filter(
        user=user,
    ).count()

    return {
        "total_tasks_completed": total_tasks,
        "war_mode_sessions": war_sessions,
        "full_war_sessions": full_war_sessions,
        "journal_entries": journal_count,
    }
