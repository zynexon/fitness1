import json
import os

from django.core.management.base import BaseCommand

from api.models import User
from api.services import get_weekly_war_report


class Command(BaseCommand):
    help = "Send weekly war report push notifications to all users"

    def handle(self, *args, **options):
        try:
            from pywebpush import WebPushException, webpush
        except ImportError:
            self.stdout.write(self.style.ERROR("pywebpush not installed. Run: pip install pywebpush"))
            return

        vapid_private_key = os.getenv("VAPID_PRIVATE_KEY", "")
        vapid_email = os.getenv("VAPID_EMAIL", "")  # Required — set per deployment (e.g. mailto:admin@example.com)

        if not vapid_private_key:
            self.stdout.write(self.style.ERROR("VAPID_PRIVATE_KEY env var not set"))
            return

        if not vapid_email:
            self.stdout.write(self.style.ERROR("VAPID_EMAIL env var not set (e.g. mailto:admin@example.com)"))
            return

        # Push notification copy — override via env vars to reskin without code changes
        notif_title_template = os.getenv(
            "PUSH_REPORT_TITLE", "Weekly Report - Grade {grade}"
        )
        notif_body_template = os.getenv(
            "PUSH_REPORT_BODY",
            "{tasks} tasks - {xp} XP earned this week. Tap to see your full report.",
        )

        sent = 0
        users = User.objects.prefetch_related("push_subscriptions").all()

        for user in users:
            subs = user.push_subscriptions.all()
            if not subs.exists():
                continue

            report = get_weekly_war_report(user)
            grade = report["grade"]
            xp = report["total_xp_earned"]
            tasks = report["tasks_completed"]

            payload = json.dumps(
                {
                    "title": notif_title_template.format(grade=grade, tasks=tasks, xp=xp),
                    "body": notif_body_template.format(grade=grade, tasks=tasks, xp=xp),
                    "url": "/weekly-report",
                    "icon": "/icons/icon-192.png",
                    "badge": "/icons/icon-192.png",
                }
            )

            for sub in subs:
                try:
                    webpush(
                        subscription_info={
                            "endpoint": sub.endpoint,
                            "keys": {
                                "p256dh": sub.p256dh,
                                "auth": sub.auth,
                            },
                        },
                        data=payload,
                        vapid_private_key=vapid_private_key,
                        vapid_claims={"sub": vapid_email},
                    )
                    sent += 1
                except WebPushException as exc:
                    if "410" in str(exc) or "404" in str(exc):
                        sub.delete()
                    else:
                        self.stdout.write(self.style.WARNING(f"Push failed for {user.email}: {exc}"))

        self.stdout.write(self.style.SUCCESS(f"Sent {sent} push notifications"))
