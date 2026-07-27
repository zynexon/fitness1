from django.core.management.base import BaseCommand

from api.services import seed_task_templates


class Command(BaseCommand):
    help = "Seed default task templates"

    def handle(self, *args, **options):
        created = seed_task_templates()
        self.stdout.write(
            self.style.SUCCESS(
                f"Seed completed. Created {created} new task template(s)."
            )
        )
