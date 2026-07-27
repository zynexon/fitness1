from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0003_gamesession'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='name',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
    ]
