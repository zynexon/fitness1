from django.core.management.base import BaseCommand

from api.artifact_services import seed_artifact_catalogue


class Command(BaseCommand):
    help = "Seed legacy artifact catalogue"

    def handle(self, *args, **options):
        created = seed_artifact_catalogue()
        self.stdout.write(
            self.style.SUCCESS(
                f"Seed completed. Created {created} new artifact(s)."
            )
        )
