from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0006_journalentry'),
    ]

    operations = [
        migrations.AlterField(
            model_name='gamesession',
            name='game_type',
            field=models.CharField(
                choices=[
                    ('quick_math', 'Quick Math'),
                    ('focus_tap', 'Focus Tap'),
                    ('number_recall', 'Number Recall'),
                ],
                default='quick_math',
                max_length=20,
            ),
        ),
    ]
