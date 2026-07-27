from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0004_user_name'),
    ]

    operations = [
        migrations.AddField(
            model_name='gamesession',
            name='game_type',
            field=models.CharField(
                choices=[('quick_math', 'Quick Math'), ('focus_tap', 'Focus Tap')],
                default='quick_math',
                max_length=20,
            ),
        ),
    ]
