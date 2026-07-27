from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0023_usertask_custom_category"),
    ]

    operations = [
        # 1. Add prestige_level to User
        migrations.AddField(
            model_name="user",
            name="prestige_level",
            field=models.IntegerField(default=0),
        ),
        # 2. Create LegacyArtifact catalogue table
        migrations.CreateModel(
            name="LegacyArtifact",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("slug", models.CharField(max_length=64, unique=True)),
                ("name", models.CharField(max_length=120)),
                ("lore", models.TextField()),
                ("rarity", models.CharField(
                    max_length=20,
                    choices=[
                        ("common", "Common"),
                        ("rare", "Rare"),
                        ("epic", "Epic"),
                        ("legendary", "Legendary"),
                        ("mythic", "Mythic"),
                    ],
                    default="common",
                )),
                # Which prestige level or milestone unlocks this
                ("unlock_condition", models.CharField(max_length=100)),
                # SVG key / icon identifier used by the frontend
                ("icon_key", models.CharField(max_length=64)),
                ("color_primary", models.CharField(max_length=20, default="#a78bfa")),
                ("color_secondary", models.CharField(max_length=20, default="#6d28d9")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"ordering": ["rarity", "name"]},
        ),
        # 3. User <-> LegacyArtifact earned vault (M2M through table)
        migrations.CreateModel(
            name="UserArtifact",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("earned_at", models.DateTimeField(auto_now_add=True)),
                ("prestige_at_earn", models.IntegerField(default=0)),
                ("season_label", models.CharField(max_length=40, blank=True, default="")),
                ("is_equipped", models.BooleanField(default=False)),
                ("user", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="user_artifacts",
                    to=settings.AUTH_USER_MODEL,
                )),
                ("artifact", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="user_artifacts",
                    to="api.legacyartifact",
                )),
            ],
            options={
                "ordering": ["-earned_at"],
                "constraints": [
                    models.UniqueConstraint(
                        fields=("user", "artifact"),
                        name="unique_user_artifact",
                    )
                ],
            },
        ),
    ]
