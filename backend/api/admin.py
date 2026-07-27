from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import Challenge, DailyChallenge, DailyChallengeCompletion, Task, User, UserTask, XPLog


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
