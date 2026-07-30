import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
	FOCUS_STUDY = "study"
	FOCUS_FITNESS = "fitness"
	FOCUS_DISCIPLINE = "discipline"
	FOCUS_WORK = "work"
	FOCUS_LOGIC = "logic"
	FOCUS_CHOICES = [
		(FOCUS_STUDY, "Study / Learning"),
		(FOCUS_FITNESS, "Fitness"),
		(FOCUS_DISCIPLINE, "Discipline / Focus"),
		(FOCUS_WORK, "Work / Productivity"),
		(FOCUS_LOGIC, "Logic"),
	]

	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	name = models.CharField(max_length=100, null=True, blank=True)
	email = models.EmailField(unique=True)
	xp = models.IntegerField(default=0)
	level = models.IntegerField(default=1)
	prestige_level = models.IntegerField(default=0)
	streak = models.IntegerField(default=0)
	equipped_badge = models.CharField(max_length=50, null=True, blank=True)
	focus_category = models.CharField(max_length=20, choices=FOCUS_CHOICES, null=True, blank=True)
	streak_shields = models.IntegerField(default=0)
	shield_used_today = models.BooleanField(default=False)
	last_perfect_week_shield_date = models.DateField(null=True, blank=True)
	last_active_date = models.DateField(null=True, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	is_coach = models.BooleanField(default=False)
	coach = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='clients')
	coach_note = models.TextField(blank=True, default="")
	client_group = models.ForeignKey('ClientGroup', on_delete=models.SET_NULL, null=True, blank=True, related_name='members')
	archived_at = models.DateTimeField(null=True, blank=True)


class CoachInvite(models.Model):
	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	coach = models.ForeignKey(User, on_delete=models.CASCADE, related_name='invites')
	code = models.CharField(max_length=12, unique=True)
	created_at = models.DateTimeField(auto_now_add=True)
	expires_at = models.DateTimeField(null=True, blank=True)
	is_active = models.BooleanField(default=True)
	max_uses = models.PositiveIntegerField(default=1, null=True, blank=True)
	use_count = models.PositiveIntegerField(default=0)

	def __str__(self):
		return f"Invite {self.code} by {self.coach.email}"


class ClientGroup(models.Model):
	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	coach = models.ForeignKey(User, on_delete=models.CASCADE, related_name='client_groups')
	name = models.CharField(max_length=255)
	description = models.TextField(blank=True, default="")
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ["-created_at"]

	def __str__(self):
		return f"{self.name} (coach: {self.coach.email})"


class Task(models.Model):
	CATEGORY_STUDY = "study"
	CATEGORY_FITNESS = "fitness"
	CATEGORY_DISCIPLINE = "discipline"
	CATEGORY_WORK = "work"
	CATEGORY_LOGIC = "logic"
	CATEGORY_GENERAL = "general"
	CATEGORY_CHOICES = [
		(CATEGORY_STUDY, "Study / Learning"),
		(CATEGORY_FITNESS, "Fitness"),
		(CATEGORY_DISCIPLINE, "Discipline / Focus"),
		(CATEGORY_WORK, "Work / Productivity"),
		(CATEGORY_LOGIC, "Logic"),
		(CATEGORY_GENERAL, "General"),
	]

	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	title = models.CharField(max_length=255)
	xp = models.IntegerField()
	category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default=CATEGORY_GENERAL)

	def __str__(self):
		return self.title


class DailyTaskSet(models.Model):
	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	date = models.DateField()
	category = models.CharField(max_length=20, default=Task.CATEGORY_GENERAL)
	tasks = models.ManyToManyField(Task, related_name="daily_sets")
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ["-date"]
		constraints = [
			models.UniqueConstraint(
				fields=["date", "category"],
				name="unique_daily_task_set_per_date_category",
			)
		]

	def __str__(self):
		return f"Daily tasks for {self.date} ({self.category})"


class UserTask(models.Model):
	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="user_tasks")
	task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="user_tasks")
	date = models.DateField()
	completed = models.BooleanField(default=False)
	completed_at = models.DateTimeField(null=True, blank=True)
	# Custom task support
	is_custom = models.BooleanField(default=False)
	custom_title = models.CharField(max_length=255, blank=True, default="")
	custom_category = models.CharField(max_length=20, blank=True, default="")
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		constraints = [
			models.UniqueConstraint(
				fields=["user", "task", "date"],
				name="unique_user_task_per_day",
			)
		]


class XPLog(models.Model):
	SOURCE_TASK = "task"
	SOURCE_GAME = "game"
	SOURCE_JOURNAL = "journal"
	SOURCE_DAILY_CHALLENGE = "daily_challenge"
	SOURCE_WAGER = "wager"
	SOURCE_WORKOUT = "workout"
	SOURCE_CHOICES = [
		(SOURCE_TASK, "Task"),
		(SOURCE_GAME, "Game"),
		(SOURCE_JOURNAL, "Journal"),
		(SOURCE_DAILY_CHALLENGE, "Daily Challenge"),
		(SOURCE_WAGER, "Wager"),
		(SOURCE_WORKOUT, "Workout"),
	]

	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="xp_logs")
	source = models.CharField(max_length=20, choices=SOURCE_CHOICES)
	amount = models.IntegerField()
	created_at = models.DateTimeField(auto_now_add=True)


class GameSession(models.Model):
	TYPE_QUICK_MATH = "quick_math"
	TYPE_FOCUS_TAP = "focus_tap"
	TYPE_REACTION_TAP = "reaction_tap"
	TYPE_NUMBER_RECALL = "number_recall"
	TYPE_COLOR_COUNT_FOCUS = "color_count_focus"
	TYPE_SPEED_PATTERN = "speed_pattern"
	TYPE_REVERSE_ORDER = "reverse_order"
	TYPE_NUMBER_STACK = "number_stack"
	TYPE_LOGIC_GRID = "logic_grid"
	TYPE_PATTERN_SEQUENCE = "pattern_sequence"
	TYPE_WAR_MODE_SKIRMISH = "war_mode_skirmish"
	TYPE_WAR_MODE_BATTLE = "war_mode_battle"
	TYPE_WAR_MODE_FULL_WAR = "war_mode_full_war"
	TYPE_CHOICES = [
		(TYPE_QUICK_MATH, "Quick Math"),
		(TYPE_FOCUS_TAP, "Focus Tap"),
		(TYPE_REACTION_TAP, "Reaction Tap"),
		(TYPE_NUMBER_RECALL, "Number Recall"),
		(TYPE_COLOR_COUNT_FOCUS, "Color Count Focus"),
		(TYPE_SPEED_PATTERN, "Speed Pattern"),
		(TYPE_REVERSE_ORDER, "Reverse Order"),
		(TYPE_NUMBER_STACK, "Number Stack"),
		(TYPE_LOGIC_GRID, "Logic Grid"),
		(TYPE_PATTERN_SEQUENCE, "Pattern Sequence"),
		(TYPE_WAR_MODE_SKIRMISH, "War Mode Skirmish"),
		(TYPE_WAR_MODE_BATTLE, "War Mode Battle"),
		(TYPE_WAR_MODE_FULL_WAR, "War Mode Full War"),
	]

	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="game_sessions")
	game_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default=TYPE_QUICK_MATH)
	started_at = models.DateTimeField(auto_now_add=True)
	ended_at = models.DateTimeField(null=True, blank=True)
	score = models.IntegerField(default=0)
	xp_awarded = models.IntegerField(default=0)

	class Meta:
		ordering = ["-started_at"]


class JournalEntry(models.Model):
	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="journal_entries")
	date = models.DateField()
	mood = models.CharField(max_length=50, blank=True, default="")
	weather = models.CharField(max_length=50, blank=True, default="")
	activity = models.CharField(max_length=50, blank=True, default="")
	mood_score = models.IntegerField(null=True, blank=True)
	energy_score = models.IntegerField(null=True, blank=True)
	objective = models.CharField(max_length=160, blank=True, default="")
	productivity = models.CharField(max_length=50, blank=True, default="")
	social = models.CharField(max_length=50, blank=True, default="")
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		constraints = [
			models.UniqueConstraint(
				fields=["user", "date"],
				name="unique_user_journal_entry_per_day",
			)
		]
		ordering = ["-date", "-updated_at"]


class DailyChallenge(models.Model):
	TYPE_COMPLETE_3_TASKS = "complete_3_tasks"
	TYPE_EARN_20_XP_FROM_GAMES = "earn_20_xp_from_games"
	TYPE_WRITE_JOURNAL_ENTRY = "write_journal_entry"
	TYPE_COMPLETE_MORNING_TASK = "complete_morning_task_before_10am"
	TYPE_CHOICES = [
		(TYPE_COMPLETE_3_TASKS, "Complete 3 Tasks"),
		(TYPE_EARN_20_XP_FROM_GAMES, "Earn 20 XP from Games"),
		(TYPE_WRITE_JOURNAL_ENTRY, "Write Journal Entry"),
		(TYPE_COMPLETE_MORNING_TASK, "Complete Morning Task Before 10AM"),
	]

	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	date = models.DateField(unique=True)
	challenge_type = models.CharField(max_length=50, choices=TYPE_CHOICES)
	description = models.CharField(max_length=255)
	target_value = models.IntegerField(default=1)
	reward_xp = models.IntegerField(default=30)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ["-date"]

	def __str__(self):
		return f"{self.date} - {self.challenge_type}"


class DailyChallengeCompletion(models.Model):
	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="daily_challenge_completions")
	challenge = models.ForeignKey(DailyChallenge, on_delete=models.CASCADE, related_name="completions")
	completed_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		constraints = [
			models.UniqueConstraint(
				fields=["user", "challenge"],
				name="unique_user_daily_challenge_completion",
			)
		]


class PushSubscription(models.Model):
	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="push_subscriptions")
	endpoint = models.TextField(unique=True)
	p256dh = models.TextField()
	auth = models.TextField()
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ["-created_at"]


class Challenge(models.Model):
	STATUS_OPEN = "open"
	STATUS_ACCEPTED = "accepted"
	STATUS_COMPLETED = "completed"
	STATUS_EXPIRED = "expired"
	STATUS_CHOICES = [
		(STATUS_OPEN, "Open"),
		(STATUS_ACCEPTED, "Accepted"),
		(STATUS_COMPLETED, "Completed"),
		(STATUS_EXPIRED, "Expired"),
	]

	WINNER_CHALLENGER = "challenger"
	WINNER_OPPONENT = "opponent"
	WINNER_TIE = "tie"
	WINNER_CHOICES = [
		(WINNER_CHALLENGER, "Challenger"),
		(WINNER_OPPONENT, "Opponent"),
		(WINNER_TIE, "Tie"),
	]

	GAME_TYPE_CHOICES = [
		("quick_math", "Quick Math"),
		("focus_tap", "Focus Tap"),
		("number_recall", "Number Recall"),
		("color_count_focus", "Color Count Focus"),
		("speed_pattern", "Speed Pattern"),
		("reverse_order", "Reverse Order"),
		("number_stack", "Number Stack"),
		("pattern_sequence", "Pattern Sequence"),
		("logic_grid", "Logic Grid"),
		("reaction_tap", "Reaction Tap"),
	]

	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	challenger = models.ForeignKey(User, on_delete=models.CASCADE, related_name="challenges_sent")
	opponent = models.ForeignKey(User, on_delete=models.SET_NULL, related_name="challenges_received", null=True, blank=True)
	game_type = models.CharField(max_length=30, choices=GAME_TYPE_CHOICES)
	challenger_score = models.IntegerField()
	challenger_metric = models.FloatField(null=True, blank=True)
	challenger_xp_wager = models.IntegerField(default=0)
	seed = models.JSONField(default=dict, blank=True)
	status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_OPEN)
	opponent_score = models.IntegerField(null=True, blank=True)
	opponent_metric = models.FloatField(null=True, blank=True)
	winner = models.CharField(max_length=20, choices=WINNER_CHOICES, null=True, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	expires_at = models.DateTimeField()
	completed_at = models.DateTimeField(null=True, blank=True)

	class Meta:
		ordering = ["-created_at"]

	def __str__(self):
		return f"{self.game_type} challenge by {self.challenger_id}"


class LegacyArtifact(models.Model):
	RARITY_COMMON = "common"
	RARITY_RARE = "rare"
	RARITY_EPIC = "epic"
	RARITY_LEGENDARY = "legendary"
	RARITY_MYTHIC = "mythic"
	RARITY_CHOICES = [
		(RARITY_COMMON, "Common"),
		(RARITY_RARE, "Rare"),
		(RARITY_EPIC, "Epic"),
		(RARITY_LEGENDARY, "Legendary"),
		(RARITY_MYTHIC, "Mythic"),
	]

	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	slug = models.CharField(max_length=64, unique=True)
	name = models.CharField(max_length=120)
	lore = models.TextField()
	rarity = models.CharField(max_length=20, choices=RARITY_CHOICES, default=RARITY_COMMON)
	unlock_condition = models.CharField(max_length=100)
	icon_key = models.CharField(max_length=64)
	color_primary = models.CharField(max_length=20, default="#a78bfa")
	color_secondary = models.CharField(max_length=20, default="#6d28d9")
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ["rarity", "name"]

	def __str__(self):
		return self.name


class UserArtifact(models.Model):
	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="user_artifacts")
	artifact = models.ForeignKey(LegacyArtifact, on_delete=models.CASCADE, related_name="user_artifacts")
	earned_at = models.DateTimeField(auto_now_add=True)
	prestige_at_earn = models.IntegerField(default=0)
	season_label = models.CharField(max_length=40, blank=True, default="")
	is_equipped = models.BooleanField(default=False)

	class Meta:
		ordering = ["-earned_at"]
		constraints = [
			models.UniqueConstraint(
				fields=["user", "artifact"],
				name="unique_user_artifact",
			)
		]


# ── Workout System ──────────────────────────────────────────────────────────

WEEKDAY_CHOICES = [
	(0, "Monday"),
	(1, "Tuesday"),
	(2, "Wednesday"),
	(3, "Thursday"),
	(4, "Friday"),
	(5, "Saturday"),
	(6, "Sunday"),
]


class Exercise(models.Model):
	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	coach = models.ForeignKey(User, on_delete=models.CASCADE, related_name="exercises")
	name = models.CharField(max_length=255)
	description = models.TextField(blank=True, default="")
	video_url = models.URLField(blank=True, default="")
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ["name"]

	def __str__(self):
		return self.name


class Program(models.Model):
	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	coach = models.ForeignKey(User, on_delete=models.CASCADE, related_name="programs")
	name = models.CharField(max_length=255)
	description = models.TextField(blank=True, default="")
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ["-created_at"]

	def __str__(self):
		return self.name


class WorkoutDay(models.Model):
	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	program = models.ForeignKey(Program, on_delete=models.CASCADE, related_name="workout_days")
	weekday = models.IntegerField(choices=WEEKDAY_CHOICES)
	title = models.CharField(max_length=255)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ["weekday"]
		constraints = [
			models.UniqueConstraint(
				fields=["program", "weekday"],
				name="unique_workout_day_per_program_weekday",
			)
		]

	def __str__(self):
		return f"{self.program.name} — {self.get_weekday_display()}: {self.title}"


class WorkoutDayExercise(models.Model):
	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	workout_day = models.ForeignKey(WorkoutDay, on_delete=models.CASCADE, related_name="exercises")
	exercise = models.ForeignKey(Exercise, on_delete=models.CASCADE, related_name="workout_day_entries")
	order = models.IntegerField(default=0)
	prescribed_sets = models.IntegerField(null=True, blank=True)
	prescribed_reps = models.CharField(max_length=50, blank=True, default="")
	notes = models.CharField(max_length=255, blank=True, default="")

	class Meta:
		ordering = ["order"]

	def __str__(self):
		return f"{self.exercise.name} (order {self.order})"


class ProgramAssignment(models.Model):
	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	client = models.ForeignKey(User, on_delete=models.CASCADE, related_name="program_assignments")
	program = models.ForeignKey(Program, on_delete=models.CASCADE, related_name="assignments")
	assigned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="assigned_programs")
	start_date = models.DateField()
	is_active = models.BooleanField(default=True)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ["-created_at"]

	def __str__(self):
		return f"{self.client} → {self.program.name}"


class WorkoutLog(models.Model):
	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="workout_logs")
	workout_day = models.ForeignKey(WorkoutDay, on_delete=models.CASCADE, related_name="logs")
	date = models.DateField()
	completed = models.BooleanField(default=False)
	xp_awarded = models.IntegerField(default=0)
	completed_at = models.DateTimeField(null=True, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ["-date"]
		constraints = [
			models.UniqueConstraint(
				fields=["user", "date"],
				name="unique_workout_log_per_user_date",
			)
		]

	def __str__(self):
		return f"{self.user} — {self.date} — {self.workout_day.title}"


class WorkoutLogExercise(models.Model):
	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	workout_log = models.ForeignKey(WorkoutLog, on_delete=models.CASCADE, related_name="exercise_logs")
	workout_day_exercise = models.ForeignKey(WorkoutDayExercise, on_delete=models.CASCADE, related_name="log_entries")
	completed = models.BooleanField(default=False)
	actual_weight = models.CharField(max_length=50, blank=True, default="")
	actual_reps = models.CharField(max_length=50, blank=True, default="")
	note = models.CharField(max_length=255, blank=True, default="")

	class Meta:
		ordering = ["workout_day_exercise__order"]


# ── Body Metrics System ─────────────────────────────────────────────────────

ANGLE_CHOICES = [
	("front", "Front"),
	("side", "Side"),
	("back", "Back"),
	("other", "Other"),
]


class MetricDefinition(models.Model):
	"""
	A trackable metric type, coach-owned and reusable across their clients.
	Examples: Weight (kg), Waist (cm), Chest (in), Left Arm (cm).
	"""
	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	coach = models.ForeignKey(User, on_delete=models.CASCADE, related_name="metric_definitions")
	name = models.CharField(max_length=100)
	unit = models.CharField(max_length=20)  # Free text: "kg", "lb", "cm", "in", etc.
	is_default_weight = models.BooleanField(default=False)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ["-is_default_weight", "name"]
		constraints = [
			models.UniqueConstraint(
				fields=["coach", "name"],
				name="unique_metric_definition_per_coach",
			)
		]

	def __str__(self):
		return f"{self.name} ({self.unit}) — {self.coach.email}"

	@classmethod
	def ensure_default_weight(cls, coach):
		"""
		Lazily create the default Weight metric for a coach if one doesn't exist.
		Every coach should always have at least a Weight metric available.
		"""
		metric, _ = cls.objects.get_or_create(
			coach=coach,
			is_default_weight=True,
			defaults={"name": "Weight", "unit": "kg"},
		)
		return metric


class ClientMetricSubscription(models.Model):
	"""
	Which metrics a specific client should see/log. Coach-configurable per client.
	"""
	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	client = models.ForeignKey(User, on_delete=models.CASCADE, related_name="metric_subscriptions")
	metric_definition = models.ForeignKey(MetricDefinition, on_delete=models.CASCADE, related_name="subscriptions")
	is_active = models.BooleanField(default=True)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ["-metric_definition__is_default_weight", "metric_definition__name"]
		constraints = [
			models.UniqueConstraint(
				fields=["client", "metric_definition"],
				name="unique_client_metric_subscription",
			)
		]

	def __str__(self):
		return f"{self.client.email} → {self.metric_definition.name}"


class BodyMetricEntry(models.Model):
	"""
	One check-in instance for a client on a given date.
	Same upsert pattern as JournalEntry — one entry per day, resubmitting
	the same date updates values rather than creating a duplicate row.
	"""
	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="body_metric_entries")
	date = models.DateField()
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ["-date"]
		constraints = [
			models.UniqueConstraint(
				fields=["user", "date"],
				name="unique_body_metric_entry_per_user_date",
			)
		]

	def __str__(self):
		return f"{self.user.email} — {self.date}"


class BodyMetricValue(models.Model):
	"""
	One logged number within a check-in entry (e.g. Weight = 82.5).
	"""
	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	entry = models.ForeignKey(BodyMetricEntry, on_delete=models.CASCADE, related_name="values")
	metric_definition = models.ForeignKey(MetricDefinition, on_delete=models.CASCADE, related_name="logged_values")
	value = models.FloatField()

	class Meta:
		constraints = [
			models.UniqueConstraint(
				fields=["entry", "metric_definition"],
				name="unique_body_metric_value_per_entry_metric",
			)
		]

	def __str__(self):
		return f"{self.metric_definition.name}: {self.value} {self.metric_definition.unit}"


class ProgressPhoto(models.Model):
	"""
	Progress photo uploaded by a client. No uniqueness constraint on date —
	a client can upload multiple photos (different angles) for the same day.

	NOTE: The ImageField stores files to MEDIA_ROOT on the local filesystem.
	Production deployments must configure DEFAULT_FILE_STORAGE to use cloud
	storage (e.g. django-storages + S3) — local filesystem storage is
	ephemeral on most hosting platforms.
	"""
	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="progress_photos")
	date = models.DateField()
	image = models.ImageField(upload_to="progress_photos/%Y/%m/")
	angle = models.CharField(max_length=20, blank=True, default="", choices=ANGLE_CHOICES)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ["-date", "-created_at"]

	def __str__(self):
		return f"{self.user.email} — {self.date} ({self.angle or 'no angle'})"
