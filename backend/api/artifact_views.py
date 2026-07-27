"""
Prestige + Vault API views.
Add these to backend/api/views.py (or import from here).

Add to urlpatterns in api/urls.py:
  path("user/prestige/",          PrestigeView.as_view(),        name="user-prestige"),
  path("user/vault/",             VaultView.as_view(),           name="user-vault"),
  path("user/artifact/equip/",    EquipArtifactView.as_view(),   name="artifact-equip"),
"""

from django.db import transaction
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

# Import from your artifact_services module
from .artifact_services import (
    check_and_award_milestone_artifacts,
    get_vault_for_user,
    perform_prestige,
)
from .models import User, UserArtifact
from .serializers import UserSerializer
from .services import get_user_stats


class PrestigeView(APIView):
    """
    POST /api/user/prestige/
    Requires the user to be Level 20+.
    Resets XP/level/streak, increments prestige_level, awards artifact.
    """
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        user = User.objects.select_for_update().get(id=request.user.id)

        try:
            result = perform_prestige(user)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        user_data = UserSerializer(user).data
        user_data.update(get_user_stats(user))

        return Response(
            {
                "success": True,
                "prestige_level": result["prestige_level"],
                "artifact": result["artifact"],
                "user": user_data,
                "message": (
                    f"Prestige {result['prestige_level']} unlocked. "
                    "Your legacy is sealed. The war starts again."
                ),
            },
            status=status.HTTP_200_OK,
        )


class VaultView(APIView):
    """
    GET /api/user/vault/
    Returns the user's full artifact vault (earned + locked silhouettes).
    Also awards any milestone artifacts they've newly earned.
    """
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def get(self, request):
        user = User.objects.select_for_update().get(id=request.user.id)

        # Award any newly earned milestone artifacts on each vault load
        new_awards = check_and_award_milestone_artifacts(user)

        vault = get_vault_for_user(user)
        earned_count = sum(1 for a in vault if a["earned"])

        return Response(
            {
                "prestige_level": user.prestige_level,
                "earned_count": earned_count,
                "total_count": len(vault),
                "newly_earned": [
                    {
                        "slug": ua.artifact.slug,
                        "name": ua.artifact.name,
                        "rarity": ua.artifact.rarity,
                    }
                    for ua in new_awards
                ],
                "artifacts": vault,
            }
        )


class EquipArtifactView(APIView):
    """
    PATCH /api/user/artifact/equip/
    Body: { "artifact_id": "<uuid>" | null }
    Equips or unequips an artifact. Only one can be equipped at a time.
    """
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def patch(self, request):
        artifact_id = request.data.get("artifact_id")

        # Unequip all first
        UserArtifact.objects.filter(user=request.user, is_equipped=True).update(
            is_equipped=False
        )

        equipped = None
        if artifact_id:
            try:
                ua = UserArtifact.objects.get(user=request.user, artifact_id=artifact_id)
                ua.is_equipped = True
                ua.save(update_fields=["is_equipped"])
                equipped = {
                    "id": str(ua.artifact.id),
                    "slug": ua.artifact.slug,
                    "name": ua.artifact.name,
                    "icon_key": ua.artifact.icon_key,
                    "rarity": ua.artifact.rarity,
                    "color_primary": ua.artifact.color_primary,
                }
            except UserArtifact.DoesNotExist:
                return Response(
                    {"error": "You haven't earned this artifact."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        return Response({"success": True, "equipped": equipped})
