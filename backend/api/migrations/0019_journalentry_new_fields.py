from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0018_alter_gamesession_game_type_pattern_sequence"),
    ]

    operations = [
        migrations.AddField(
            model_name="journalentry",
            name="mood_score",
            field=models.IntegerField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name="journalentry",
            name="energy_score",
            field=models.IntegerField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name="journalentry",
            name="objective",
            field=models.CharField(max_length=160, blank=True, default=""),
        ),
    ]
