from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0019_journalentry_new_fields"),
    ]

    operations = [
        migrations.CreateModel(
            name="Challenge",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("game_type", models.CharField(
                    choices=[
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
                    ],
                    max_length=30,
                )),
                ("challenger_score", models.IntegerField()),
                ("challenger_xp_wager", models.IntegerField(default=0)),
                ("seed", models.JSONField(default=dict, blank=True)),
                ("status", models.CharField(
                    choices=[
                        ("open", "Open"),
                        ("accepted", "Accepted"),
                        ("completed", "Completed"),
                        ("expired", "Expired"),
                    ],
                    default="open",
                    max_length=20,
                )),
                ("opponent_score", models.IntegerField(null=True, blank=True)),
                ("winner", models.CharField(
                    choices=[("challenger", "Challenger"), ("opponent", "Opponent"), ("tie", "Tie")],
                    max_length=20,
                    null=True,
                    blank=True,
                )),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("expires_at", models.DateTimeField()),
                ("completed_at", models.DateTimeField(null=True, blank=True)),
                ("challenger", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="challenges_sent",
                    to="api.user",
                )),
                ("opponent", models.ForeignKey(
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="challenges_received",
                    to="api.user",
                    null=True,
                    blank=True,
                )),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
