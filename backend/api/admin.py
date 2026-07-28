from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import (
	Challenge, CoachInvite, DailyChallenge, DailyChallengeCompletion,
	Task, User, UserTask, XPLog,
	Exercise, Program, WorkoutDay, WorkoutDayExercise,
	ProgramAssignment, WorkoutLog, WorkoutLogExercise,
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
	fieldsets = BaseUserAdmin.fieldsets + (
		(
			"Progression",
			{
				"fields": (
					"xp",
					"level",
					"streak",
					"last_active_date",
					"created_at",
				)
			},
		),
		(
			"Coaching",
			{
				"fields": (
					"is_coach",
					"coach",
					"coach_note",
				)
			},
		),
	)
	readonly_fields = ("created_at",)


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
	list_display = ("title", "xp")


@admin.register(UserTask)
class UserTaskAdmin(admin.ModelAdmin):
	list_display = ("user", "task", "date", "completed", "created_at")
	list_filter = ("date", "completed")


@admin.register(XPLog)
class XPLogAdmin(admin.ModelAdmin):
	list_display = ("user", "source", "amount", "created_at")
	list_filter = ("source", "created_at")


@admin.register(DailyChallenge)
class DailyChallengeAdmin(admin.ModelAdmin):
	list_display = ("date", "challenge_type", "description", "reward_xp")
	list_filter = ("date", "challenge_type")


@admin.register(DailyChallengeCompletion)
class DailyChallengeCompletionAdmin(admin.ModelAdmin):
	list_display = ("user", "challenge", "completed_at")
	list_filter = ("completed_at",)


@admin.register(Challenge)
class ChallengeAdmin(admin.ModelAdmin):
	list_display = (
		"challenger",
		"game_type",
		"challenger_score",
		"challenger_metric",
		"opponent_metric",
		"challenger_xp_wager",
		"status",
		"winner",
		"created_at",
	)
	list_filter = ("status", "game_type", "winner", "created_at")


@admin.register(CoachInvite)
class CoachInviteAdmin(admin.ModelAdmin):
	list_display = ("code", "coach", "is_active", "use_count", "created_at")
	list_filter = ("is_active", "created_at")
	search_fields = ("code", "coach__email")


# ── Workout System ──────────────────────────────────────────────────────────

@admin.register(Exercise)
class ExerciseAdmin(admin.ModelAdmin):
	list_display = ("name", "coach", "created_at")
	list_filter = ("coach",)
	search_fields = ("name",)


@admin.register(Program)
class ProgramAdmin(admin.ModelAdmin):
	list_display = ("name", "coach", "created_at")
	list_filter = ("coach",)
	search_fields = ("name",)


@admin.register(WorkoutDay)
class WorkoutDayAdmin(admin.ModelAdmin):
	list_display = ("program", "weekday", "title", "created_at")
	list_filter = ("weekday",)


@admin.register(WorkoutDayExercise)
class WorkoutDayExerciseAdmin(admin.ModelAdmin):
	list_display = ("workout_day", "exercise", "order", "prescribed_sets", "prescribed_reps")


@admin.register(ProgramAssignment)
class ProgramAssignmentAdmin(admin.ModelAdmin):
	list_display = ("client", "program", "assigned_by", "start_date", "is_active", "created_at")
	list_filter = ("is_active",)


@admin.register(WorkoutLog)
class WorkoutLogAdmin(admin.ModelAdmin):
	list_display = ("user", "workout_day", "date", "completed", "xp_awarded", "created_at")
	list_filter = ("completed", "date")


@admin.register(WorkoutLogExercise)
class WorkoutLogExerciseAdmin(admin.ModelAdmin):
	list_display = ("workout_log", "workout_day_exercise", "completed", "actual_weight", "actual_reps")


# ── Body Metrics System ─────────────────────────────────────────────────────

from .models import (
	MetricDefinition, ClientMetricSubscription,
	BodyMetricEntry, BodyMetricValue, ProgressPhoto,
)


@admin.register(MetricDefinition)
class MetricDefinitionAdmin(admin.ModelAdmin):
	list_display = ("name", "coach", "unit", "is_default_weight", "created_at")
	list_filter = ("is_default_weight", "coach")
	search_fields = ("name",)


@admin.register(ClientMetricSubscription)
class ClientMetricSubscriptionAdmin(admin.ModelAdmin):
	list_display = ("client", "metric_definition", "is_active", "created_at")
	list_filter = ("is_active",)


@admin.register(BodyMetricEntry)
class BodyMetricEntryAdmin(admin.ModelAdmin):
	list_display = ("user", "date", "created_at")
	list_filter = ("date",)


@admin.register(BodyMetricValue)
class BodyMetricValueAdmin(admin.ModelAdmin):
	list_display = ("entry", "metric_definition", "value")


@admin.register(ProgressPhoto)
class ProgressPhotoAdmin(admin.ModelAdmin):
	list_display = ("user", "date", "angle", "created_at")
	list_filter = ("date", "angle")
