from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0020_challenge"),
    ]

    operations = [
        migrations.AddField(
            model_name="challenge",
            name="challenger_metric",
            field=models.FloatField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name="challenge",
            name="opponent_metric",
            field=models.FloatField(null=True, blank=True),
        ),
    ]
