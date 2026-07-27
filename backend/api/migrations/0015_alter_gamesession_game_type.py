from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0014_usertask_completed_at_daily_challenge"),
    ]

    operations = [
        migrations.AlterField(
            model_name="gamesession",
            name="game_type",
            field=models.CharField(
                choices=[
                    ("quick_math", "Quick Math"),
                    ("focus_tap", "Focus Tap"),
                    ("reaction_tap", "Reaction Tap"),
                    ("number_recall", "Number Recall"),
                    ("color_count_focus", "Color Count Focus"),
                    ("speed_pattern", "Speed Pattern"),
                    ("reverse_order", "Reverse Order"),
                    ("number_stack", "Number Stack"),
                    ("war_mode_skirmish", "War Mode Skirmish"),
                    ("war_mode_battle", "War Mode Battle"),
                    ("war_mode_full_war", "War Mode Full War"),
                ],
                default="quick_math",
                max_length=20,
            ),
        ),
    ]