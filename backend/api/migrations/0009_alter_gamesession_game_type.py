from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0008_alter_gamesession_game_type'),
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
                    ('color_count_focus', 'Color Count Focus'),
                    ('speed_pattern', 'Speed Pattern'),
                ],
                default='quick_math',
                max_length=20,
            ),
        ),
    ]
