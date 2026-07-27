from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0021_challenge_metrics"),
    ]

    operations = [
        migrations.AddField(
            model_name="usertask",
            name="is_custom",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="usertask",
            name="custom_title",
            field=models.CharField(max_length=255, blank=True, default=""),
        ),
    ]
