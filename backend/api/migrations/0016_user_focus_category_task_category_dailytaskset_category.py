from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0015_alter_gamesession_game_type"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="focus_category",
            field=models.CharField(
                blank=True,
                choices=[
                    ("study", "Study / Learning"),
                    ("fitness", "Fitness"),
                    ("discipline", "Discipline / Focus"),
                    ("work", "Work / Productivity"),
                    ("logic", "Logic"),
                ],
                max_length=20,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="task",
            name="category",
            field=models.CharField(
                choices=[
                    ("study", "Study / Learning"),
                    ("fitness", "Fitness"),
                    ("discipline", "Discipline / Focus"),
                    ("work", "Work / Productivity"),
                    ("logic", "Logic"),
                    ("general", "General"),
                ],
                default="general",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="dailytaskset",
            name="category",
            field=models.CharField(default="general", max_length=20),
        ),
        migrations.AlterField(
            model_name="dailytaskset",
            name="date",
            field=models.DateField(),
        ),
        migrations.AddConstraint(
            model_name="dailytaskset",
            constraint=models.UniqueConstraint(
                fields=("date", "category"),
                name="unique_daily_task_set_per_date_category",
            ),
        ),
    ]
