from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "migration_0022_custom_tasks"),
    ]

    operations = [
        migrations.AddField(
            model_name="usertask",
            name="custom_category",
            field=models.CharField(max_length=20, blank=True, default=""),
        ),
    ]
