# Generated migration for DailyTaskSet model

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='DailyTaskSet',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('date', models.DateField(unique=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('tasks', models.ManyToManyField(related_name='daily_sets', to='api.Task')),
            ],
            options={
                'ordering': ['-date'],
            },
        ),
    ]
