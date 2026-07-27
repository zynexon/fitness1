"""
Legacy Artifact catalogue + prestige service functions.
Drop this into backend/api/ alongside services.py.
"""

# ---------------------------------------------------------------------------
# ARTIFACT CATALOGUE
# Each entry maps to one LegacyArtifact row seeded via management command.
# ---------------------------------------------------------------------------

ARTIFACT_CATALOGUE = [
    # ── Prestige reset milestones ──────────────────────────────────────────
    {
        "slug": "ember_sigil",
        "name": "The Ember Sigil",
        "lore": "Forged the moment you chose to burn everything you built and start again. Most never dare. You did.",
        "rarity": "rare",
        "unlock_condition": "prestige_1",
        "icon_key": "flame",
        "color_primary": "#f97316",
        "color_secondary": "#7c2d12",
    },
    {
        "slug": "iron_phoenix",
        "name": "Iron Phoenix",
        "lore": "Twice reborn from the ashes. Your discipline is not a streak — it is a cycle of death and resurrection.",
        "rarity": "epic",
        "unlock_condition": "prestige_2",
        "icon_key": "phoenix",
        "color_primary": "#ef4444",
        "color_secondary": "#450a0a",
    },
    {
        "slug": "obsidian_crown",
        "name": "The Obsidian Crown",
        "lore": "Three times you reached the summit. Three times you descended. The crown is made of every day you showed up anyway.",
        "rarity": "epic",
        "unlock_condition": "prestige_3",
        "icon_key": "crown",
        "color_primary": "#a855f7",
        "color_secondary": "#3b0764",
    },
    {
        "slug": "void_matrix",
        "name": "Void Matrix",
        "lore": "Four cycles completed. You have stared into the void of a reset counter more times than most ever will, and you are still here.",
        "rarity": "legendary",
        "unlock_condition": "prestige_4",
        "icon_key": "matrix",
        "color_primary": "#06b6d4",
        "color_secondary": "#083344",
    },
    {
        "slug": "diamond_neural_core",
        "name": "Diamond Neural Core",
        "lore": "Five complete cycles of sacrifice and renewal. Your mind is not a muscle — it is a weapon, sharpened by repetition beyond human tolerance.",
        "rarity": "mythic",
        "unlock_condition": "prestige_5",
        "icon_key": "diamond",
        "color_primary": "#e0f2fe",
        "color_secondary": "#0c4a6e",
    },
    # ── Streak milestones (awarded once, never reset) ──────────────────────
    {
        "slug": "iron_spine",
        "name": "Iron Spine",
        "lore": "Thirty consecutive days. No shields used. No excuses accepted.",
        "rarity": "rare",
        "unlock_condition": "streak_30_clean",
        "icon_key": "spine",
        "color_primary": "#94a3b8",
        "color_secondary": "#1e293b",
    },
    {
        "slug": "phantom_chain",
        "name": "Phantom Chain",
        "lore": "Sixty days unbroken. Most people cannot maintain a habit for two weeks. You have done it four times over.",
        "rarity": "epic",
        "unlock_condition": "streak_60",
        "icon_key": "chain",
        "color_primary": "#818cf8",
        "color_secondary": "#1e1b4b",
    },
    {
        "slug": "eternal_flame",
        "name": "Eternal Flame",
        "lore": "One hundred days of war. One hundred mornings where discipline was chosen over comfort. The flame does not go out.",
        "rarity": "mythic",
        "unlock_condition": "streak_100",
        "icon_key": "eternal_flame",
        "color_primary": "#fbbf24",
        "color_secondary": "#451a03",
    },
    # ── XP milestones ──────────────────────────────────────────────────────
    {
        "slug": "war_seal",
        "name": "The War Seal",
        "lore": "Ten thousand XP earned through consistent action. This is not talent. This is volume.",
        "rarity": "rare",
        "unlock_condition": "xp_10000",
        "icon_key": "seal",
        "color_primary": "#22c55e",
        "color_secondary": "#052e16",
    },
    {
        "slug": "sovereign_relic",
        "name": "Sovereign Relic",
        "lore": "Fifty thousand XP. A number that only exists because you showed up every single day when it was inconvenient.",
        "rarity": "legendary",
        "unlock_condition": "xp_50000",
        "icon_key": "relic",
        "color_primary": "#f59e0b",
        "color_secondary": "#292524",
    },
]


def seed_artifact_catalogue():
    """Import and upsert all artifacts. Safe to call multiple times."""
    from .models import LegacyArtifact  # local import avoids circular deps

    created = 0
    for data in ARTIFACT_CATALOGUE:
        _, was_created = LegacyArtifact.objects.update_or_create(
            slug=data["slug"],
            defaults={k: v for k, v in data.items() if k != "slug"},
        )
        if was_created:
            created += 1
    return created


# ---------------------------------------------------------------------------
# PRESTIGE SERVICE
# ---------------------------------------------------------------------------

def get_prestige_artifact_slug(prestige_level: int) -> str | None:
    """Return the artifact slug that corresponds to a given prestige level."""
    mapping = {
        1: "ember_sigil",
        2: "iron_phoenix",
        3: "obsidian_crown",
        4: "void_matrix",
        5: "diamond_neural_core",
    }
    return mapping.get(prestige_level)


def check_and_award_milestone_artifacts(user):
    """
    Check streak and XP milestones and award any artifacts the user
    has earned but not yet received. Returns list of new UserArtifact ids.
    """
    from .models import LegacyArtifact, UserArtifact

    earned_unlocks = set(
        user.user_artifacts.values_list("artifact__unlock_condition", flat=True)
    )
    new_awards = []

    milestone_checks = [
        ("streak_30_clean", user.streak >= 30),
        ("streak_60",       user.streak >= 60),
        ("streak_100",      user.streak >= 100),
        ("xp_10000",        user.xp >= 10_000),
        ("xp_50000",        user.xp >= 50_000),
    ]

    season_label = _season_label()

    for unlock_condition, condition in milestone_checks:
        if condition and unlock_condition not in earned_unlocks:
            try:
                artifact = LegacyArtifact.objects.get(unlock_condition=unlock_condition)
                ua = UserArtifact.objects.create(
                    user=user,
                    artifact=artifact,
                    prestige_at_earn=user.prestige_level,
                    season_label=season_label,
                )
                new_awards.append(ua)
            except LegacyArtifact.DoesNotExist:
                pass  # catalogue not seeded yet

    return new_awards


def perform_prestige(user):
    """
    Execute a full prestige reset in a single atomic operation.
    Returns a dict with the new prestige level and artifact earned.
    Must be called inside a transaction.atomic() block.
    """
    from django.db import transaction
    from .models import LegacyArtifact, UserArtifact, XPLog
    from django.utils import timezone

    MIN_LEVEL_FOR_PRESTIGE = 20  # must be at least Level 20 to prestige

    if user.level < MIN_LEVEL_FOR_PRESTIGE:
        raise ValueError(
            f"You must reach Level {MIN_LEVEL_FOR_PRESTIGE} before prestiging. "
            f"Current level: {user.level}."
        )

    new_prestige = user.prestige_level + 1
    artifact_slug = get_prestige_artifact_slug(new_prestige)
    artifact_data = None

    # Reset progression
    user.xp = 0
    user.level = 1
    user.streak = 0
    user.last_active_date = None
    user.prestige_level = new_prestige
    user.streak_shields = 0
    user.shield_used_today = False
    user.save(update_fields=[
        "xp", "level", "streak", "last_active_date",
        "prestige_level", "streak_shields", "shield_used_today",
    ])

    # Award artifact
    if artifact_slug:
        try:
            artifact = LegacyArtifact.objects.get(slug=artifact_slug)
            season = _season_label()
            ua, _ = UserArtifact.objects.get_or_create(
                user=user,
                artifact=artifact,
                defaults={
                    "prestige_at_earn": new_prestige,
                    "season_label": season,
                },
            )
            artifact_data = {
                "id": str(artifact.id),
                "slug": artifact.slug,
                "name": artifact.name,
                "lore": artifact.lore,
                "rarity": artifact.rarity,
                "icon_key": artifact.icon_key,
                "color_primary": artifact.color_primary,
                "color_secondary": artifact.color_secondary,
                "season_label": ua.season_label,
            }
        except LegacyArtifact.DoesNotExist:
            pass  # catalogue not seeded — silent

    return {
        "prestige_level": new_prestige,
        "artifact": artifact_data,
        "reset_xp": 0,
        "reset_level": 1,
        "reset_streak": 0,
    }


def _season_label() -> str:
    """Returns a human-readable season+year string e.g. 'Summer 2026'."""
    from django.utils import timezone
    month = timezone.now().month
    year = timezone.now().year
    if month in (12, 1, 2):
        season = "Winter"
    elif month in (3, 4, 5):
        season = "Spring"
    elif month in (6, 7, 8):
        season = "Summer"
    else:
        season = "Autumn"
    return f"{season} {year}"


def get_vault_for_user(user):
    """
    Returns all artifacts: earned ones with full data, locked ones as
    silhouettes. Sorted: earned first, then locked by rarity.
    """
    from .models import LegacyArtifact, UserArtifact

    rarity_order = {"common": 0, "rare": 1, "epic": 2, "legendary": 3, "mythic": 4}

    earned_map = {
        ua.artifact_id: ua
        for ua in user.user_artifacts.select_related("artifact").all()
    }

    all_artifacts = LegacyArtifact.objects.all()
    result = []

    for artifact in all_artifacts:
        ua = earned_map.get(artifact.id)
        if ua:
            result.append({
                "earned": True,
                "id": str(artifact.id),
                "slug": artifact.slug,
                "name": artifact.name,
                "lore": artifact.lore,
                "rarity": artifact.rarity,
                "icon_key": artifact.icon_key,
                "color_primary": artifact.color_primary,
                "color_secondary": artifact.color_secondary,
                "unlock_condition": artifact.unlock_condition,
                "earned_at": ua.earned_at.isoformat(),
                "season_label": ua.season_label,
                "prestige_at_earn": ua.prestige_at_earn,
                "is_equipped": ua.is_equipped,
            })
        else:
            result.append({
                "earned": False,
                "id": str(artifact.id),
                "slug": artifact.slug,
                "name": "???",
                "lore": "This relic is still sealed. Its name will be revealed when you earn it.",
                "rarity": artifact.rarity,
                "icon_key": artifact.icon_key,
                "color_primary": artifact.color_primary,
                "color_secondary": artifact.color_secondary,
                "unlock_condition": artifact.unlock_condition,
                "earned_at": None,
                "season_label": None,
                "prestige_at_earn": None,
                "is_equipped": False,
            })

    # Sort: earned first (by earn date desc), then locked by rarity asc
    result.sort(key=lambda x: (0 if x["earned"] else 1, rarity_order.get(x["rarity"], 0)))
    return result
