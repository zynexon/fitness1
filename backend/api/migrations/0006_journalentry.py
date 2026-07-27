from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0005_gamesession_game_type'),
    ]

    operations = [
        migrations.CreateModel(
            name='JournalEntry',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('date', models.DateField()),
                ('mood', models.CharField(blank=True, default='', max_length=50)),
                ('weather', models.CharField(blank=True, default='', max_length=50)),
                ('activity', models.CharField(blank=True, default='', max_length=50)),
                ('productivity', models.CharField(blank=True, default='', max_length=50)),
                ('social', models.CharField(blank=True, default='', max_length=50)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='journal_entries', to='api.user')),
            ],
            options={
                'ordering': ['-date', '-updated_at'],
            },
        ),
        migrations.AddConstraint(
            model_name='journalentry',
            constraint=models.UniqueConstraint(fields=('user', 'date'), name='unique_user_journal_entry_per_day'),
        ),
    ]
