from rest_framework import serializers

from .models import CoachInvite, JournalEntry, User, UserTask
from .services import CUSTOM_TASK_PREFIX


class GameStartInputSerializer(serializers.Serializer):
    game_type = serializers.ChoiceField(
        choices=[
            "quick_math",
            "focus_tap",
            "reaction_tap",
            "number_recall",
            "color_count_focus",
            "speed_pattern",
            "reverse_order",
            "number_stack",
            "logic_grid",
            "pattern_sequence",
            "war_mode_skirmish",
            "war_mode_battle",
            "war_mode_full_war",
        ],
        required=False,
        default="quick_math",
    )


class CompleteTaskInputSerializer(serializers.Serializer):
    userTaskId = serializers.UUIDField()


class GameXPInputSerializer(serializers.Serializer):
    xpEarned = serializers.IntegerField(min_value=1)
    game_type = serializers.ChoiceField(
        choices=[
            "quick_math",
            "focus_tap",
            "reaction_tap",
            "number_recall",
            "color_count_focus",
            "speed_pattern",
            "reverse_order",
            "number_stack",
            "logic_grid",
            "pattern_sequence",
            "war_mode_skirmish",
            "war_mode_battle",
            "war_mode_full_war",
        ],
        required=False,
        default="quick_math",
    )


class GameSubmitInputSerializer(serializers.Serializer):
    session_id = serializers.UUIDField()
    score = serializers.IntegerField(min_value=0, max_value=100)
    is_challenge = serializers.BooleanField(required=False, default=False)


class JournalEntryInputSerializer(serializers.Serializer):
    mood_score = serializers.IntegerField(min_value=1, max_value=5, required=False, allow_null=True)
    energy_score = serializers.IntegerField(min_value=1, max_value=5, required=False, allow_null=True)
    objective = serializers.CharField(required=False, allow_blank=True, max_length=160)


class JournalEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = JournalEntry
        fields = ["id", "date", "mood_score", "energy_score", "objective", "created_at", "updated_at"]


class AssignDailyTasksInputSerializer(serializers.Serializer):
    date = serializers.DateField(required=False)


class DailyTasksQuerySerializer(serializers.Serializer):
    userId = serializers.UUIDField(required=False)
    date = serializers.DateField(required=False)


class LeaderboardQuerySerializer(serializers.Serializer):
    limit = serializers.IntegerField(required=False, min_value=1, max_value=100, default=20)
    period = serializers.ChoiceField(choices=["weekly", "all_time"], required=False, default="weekly")


class BootstrapUserInputSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False)


class RegisterInputSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=30)
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    invite_code = serializers.CharField(required=True, allow_blank=False)

    def validate_name(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Name cannot be empty.")
        return cleaned


class ForgotPasswordInputSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResetPasswordInputSerializer(serializers.Serializer):
    token = serializers.CharField(max_length=2048)
    password = serializers.CharField(min_length=8, max_length=128, write_only=True)


class UpdateNameInputSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=30)

    def validate_name(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Name cannot be empty.")
        return cleaned


class UpdateFocusCategoryInputSerializer(serializers.Serializer):
    focus_category = serializers.ChoiceField(
        choices=["study", "fitness", "discipline", "work", "logic"],
    )


class EquipBadgeInputSerializer(serializers.Serializer):
    badge_id = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True)


class CreateCustomTaskInputSerializer(serializers.Serializer):
    """
    POST /api/tasks/create/
    source='custom' → requires title
    source='pool'   → requires pool_task_id
    """
    title = serializers.CharField(max_length=255, required=False, allow_blank=True)
    category = serializers.ChoiceField(
        choices=["study", "fitness", "discipline", "work", "logic", "general"],
        required=False,
    )
    source = serializers.ChoiceField(choices=["custom", "pool"], default="custom")
    pool_task_id = serializers.UUIDField(required=False)

    def validate(self, attrs):
        source = attrs.get("source", "custom")
        if source == "pool" and not attrs.get("pool_task_id"):
            raise serializers.ValidationError(
                "pool_task_id is required when source is pool."
            )
        if source == "custom":
            title = (attrs.get("title") or "").strip()
            if not title:
                raise serializers.ValidationError(
                    "title is required when source is custom."
                )
            attrs["title"] = title
        return attrs


class FocusPoolQuerySerializer(serializers.Serializer):
    category = serializers.ChoiceField(
        choices=["study", "fitness", "discipline", "work", "logic", "general"],
        required=False,
    )


class UserSerializer(serializers.ModelSerializer):
    total_tasks_completed = serializers.SerializerMethodField()

    def get_total_tasks_completed(self, obj):
        return obj.user_tasks.filter(completed=True).count()

    class Meta:
        model = User
        fields = [
            "id",
            "name",
            "email",
            "xp",
            "level",
            "prestige_level",
            "streak",
            "equipped_badge",
            "streak_shields",
            "shield_used_today",
            "focus_category",
            "total_tasks_completed",
            "last_active_date",
            "created_at",
            "is_coach",
        ]


class UserTaskSerializer(serializers.ModelSerializer):
    task_title = serializers.SerializerMethodField()
    task_xp = serializers.IntegerField(source="task.xp", read_only=True)
    task_category = serializers.SerializerMethodField()

    def get_task_title(self, obj):
        if obj.is_custom and obj.custom_title:
            return obj.custom_title
        title = obj.task.title
        # Strip internal sentinel prefix used for custom tasks
        if title.startswith(CUSTOM_TASK_PREFIX):
            return title[len(CUSTOM_TASK_PREFIX):]
        return title

    def get_task_category(self, obj):
        if obj.is_custom and obj.custom_category:
            return obj.custom_category
        return obj.task.category

    class Meta:
        model = UserTask
        fields = [
            "id",
            "task",
            "task_title",
            "task_xp",
            "task_category",
            "date",
            "completed",
            "completed_at",
            "is_custom",
            "created_at",
        ]


class PushSubscriptionSerializer(serializers.Serializer):
    endpoint = serializers.CharField()
    p256dh = serializers.CharField()
    auth = serializers.CharField()


class CoachInviteSerializer(serializers.ModelSerializer):
    invite_url = serializers.SerializerMethodField()

    class Meta:
        model = CoachInvite
        fields = ["code", "invite_url", "is_active", "use_count", "created_at"]

    def get_invite_url(self, obj):
        return f"/join/{obj.code}"


class ClientRosterSerializer(serializers.ModelSerializer):
    days_since_active = serializers.SerializerMethodField()
    week_adherence_pct = serializers.FloatField(read_only=True, default=0.0)
    prev_week_adherence_pct = serializers.FloatField(read_only=True, default=0.0)
    adherence_trend = serializers.CharField(read_only=True, default="stable")
    risk_level = serializers.CharField(read_only=True, default="on_track")

    class Meta:
        model = User
        fields = [
            "id",
            "name",
            "email",
            "streak",
            "level",
            "xp",
            "last_active_date",
            "days_since_active",
            "week_adherence_pct",
            "prev_week_adherence_pct",
            "adherence_trend",
            "risk_level",
            "streak_shields",
        ]

    def get_days_since_active(self, obj):
        if not obj.last_active_date:
            return None
        from django.utils.timezone import localdate
        return (localdate() - obj.last_active_date).days


class ClientDetailSerializer(ClientRosterSerializer):
    weekly_report = serializers.DictField(read_only=True)
    calendar = serializers.ListField(read_only=True)
    journal_trend = serializers.ListField(read_only=True)
    tasks = serializers.ListField(read_only=True)
    coach_note = serializers.CharField(read_only=True)

    class Meta(ClientRosterSerializer.Meta):
        fields = ClientRosterSerializer.Meta.fields + [
            "weekly_report",
            "calendar",
            "journal_trend",
            "tasks",
            "coach_note",
        ]


class CoachNoteInputSerializer(serializers.Serializer):
    note = serializers.CharField(allow_blank=True)


class CreateClientTaskInputSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    category = serializers.ChoiceField(
        choices=["study", "fitness", "discipline", "work", "logic", "general"],
        required=False,
        default="general",
    )
    date = serializers.DateField(required=False)


class ClientTaskHistoryQuerySerializer(serializers.Serializer):
    date = serializers.DateField(required=False)
    range = serializers.IntegerField(required=False, min_value=1, max_value=30, default=7)
