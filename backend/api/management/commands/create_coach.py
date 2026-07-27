from django.core.management.base import BaseCommand
from api.models import User

class Command(BaseCommand):
    help = 'Creates or promotes a user to a coach account.'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, required=True, help='Email of the coach')
        parser.add_argument('--password', type=str, required=True, help='Password for the coach')
        parser.add_argument('--name', type=str, required=True, help='Name of the coach')

    def handle(self, *args, **options):
        email = options['email'].strip().lower()
        password = options['password']
        name = options['name']

        try:
            user = User.objects.get(email=email)
            user.is_coach = True
            user.coach = None
            if not user.check_password(password):
                user.set_password(password)
            user.name = name
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Successfully promoted {email} to coach.'))
        except User.DoesNotExist:
            user = User.objects.create_user(
                username=email,
                email=email,
                password=password,
                name=name,
                is_coach=True,
                coach=None,
                xp=0,
                level=1,
                streak=0,
            )
            self.stdout.write(self.style.SUCCESS(f'Successfully created coach account {email}.'))
