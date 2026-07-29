import json
from urllib.parse import quote

from django.contrib.auth import get_user_model
from django.core import mail, signing
from django.test import TestCase, override_settings
from django.utils import timezone
from django.urls import reverse

from .views import PASSWORD_RESET_SIGNING_SALT
from .services import DAILY_TASK_COUNT, get_daily_tasks, seed_task_templates


class PasswordResetFlowTests(TestCase):
	def setUp(self):
		self.user_email = 'warrior@example.com'
		self.user_password = 'OldPass123!'
		self.user = get_user_model().objects.create_user(
			username=self.user_email,
			email=self.user_email,
			password=self.user_password,
			name='Warrior',
		)
		self.forgot_url = reverse('auth-forgot-password')
		self.reset_url = reverse('auth-reset-password')

	def _make_token(self):
		self.user.refresh_from_db()
		return signing.dumps(
			{'uid': str(self.user.id), 'pwd': self.user.password},
			salt=PASSWORD_RESET_SIGNING_SALT,
		)

	@override_settings(
		EMAIL_BACKEND='django.core.mail.backends.console.EmailBackend',
		FRONTEND_APP_URL='http://localhost:5173',
	)
	def test_forgot_password_returns_dev_token_with_console_backend(self):
		response = self.client.post(
			self.forgot_url,
			data=json.dumps({'email': self.user_email}),
			content_type='application/json',
		)

		self.assertEqual(response.status_code, 200)
		payload = response.json()
		self.assertTrue(payload.get('success'))
		self.assertIn('reset_token', payload)
		self.assertIn('reset_url', payload)

	@override_settings(
		EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
		FRONTEND_APP_URL='http://localhost:5173',
	)
	def test_forgot_password_sends_email_without_exposing_dev_token_on_non_console_backend(self):
		response = self.client.post(
			self.forgot_url,
			data=json.dumps({'email': self.user_email}),
			content_type='application/json',
		)

		self.assertEqual(response.status_code, 200)
		payload = response.json()
		self.assertTrue(payload.get('success'))
		self.assertNotIn('reset_token', payload)
		self.assertNotIn('reset_url', payload)

		self.assertEqual(len(mail.outbox), 1)
		self.assertIn(self.user_email, mail.outbox[0].to)
		self.assertIn('reset_token=', mail.outbox[0].body)

	@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
	def test_forgot_password_unknown_email_returns_generic_message(self):
		response = self.client.post(
			self.forgot_url,
			data=json.dumps({'email': 'missing@example.com'}),
			content_type='application/json',
		)

		self.assertEqual(response.status_code, 200)
		payload = response.json()
		self.assertEqual(
			payload.get('message'),
			'If an account exists for this email, a reset link has been sent.',
		)
		self.assertEqual(len(mail.outbox), 0)

	def test_reset_password_accepts_valid_token(self):
		token = self._make_token()
		new_password = 'NewPass123!'

		response = self.client.post(
			self.reset_url,
			data=json.dumps({'token': token, 'password': new_password}),
			content_type='application/json',
		)

		self.assertEqual(response.status_code, 200)
		self.user.refresh_from_db()
		self.assertTrue(self.user.check_password(new_password))
		self.assertFalse(self.user.check_password(self.user_password))

	def test_reset_password_rejects_invalid_token(self):
		response = self.client.post(
			self.reset_url,
			data=json.dumps({'token': 'invalid-token', 'password': 'AnotherPass123!'}),
			content_type='application/json',
		)

		self.assertEqual(response.status_code, 400)
		self.assertEqual(response.json().get('error'), 'Invalid reset link. Request a new one.')

	def test_reset_password_rejects_stale_token_after_password_change(self):
		token = self._make_token()
		self.user.set_password('ChangedBeforeReset123!')
		self.user.save(update_fields=['password'])

		response = self.client.post(
			self.reset_url,
			data=json.dumps({'token': token, 'password': 'AnotherPass123!'}),
			content_type='application/json',
		)

		self.assertEqual(response.status_code, 400)
		self.assertEqual(response.json().get('error'), 'Invalid reset link. Request a new one.')

	def test_reset_password_accepts_full_reset_url_and_quoted_printable_artifact_token(self):
		token = self._make_token()
		full_url = f'http://localhost:5173/?reset_token={quote(token, safe="")}'
		quoted_printable_artifact = f'3D{token}'

		response_url_token = self.client.post(
			self.reset_url,
			data=json.dumps({'token': full_url, 'password': 'UrlPass123!'}),
			content_type='application/json',
		)
		self.assertEqual(response_url_token.status_code, 200)

		self.user.refresh_from_db()
		token_after_first_reset = self._make_token()
		quoted_printable_artifact = f'3D{token_after_first_reset}'
		response_qp_token = self.client.post(
			self.reset_url,
			data=json.dumps({'token': quoted_printable_artifact, 'password': 'QpPass123!'}),
			content_type='application/json',
		)

		self.assertEqual(response_qp_token.status_code, 200)
		self.user.refresh_from_db()
		self.assertTrue(self.user.check_password('QpPass123!'))


class FocusCategoryTaskAssignmentTests(TestCase):
	def setUp(self):
		self.user_email = "focus-user@example.com"
		self.user_password = "StrongPass123!"
		self.user = get_user_model().objects.create_user(
			username=self.user_email,
			email=self.user_email,
			password=self.user_password,
			name="Focus User",
		)
		seed_task_templates()

	def _auth_client(self):
		client = self.client
		login_response = client.post(
			reverse("auth-login"),
			data=json.dumps({"username": self.user_email, "password": self.user_password}),
			content_type="application/json",
		)
		self.assertEqual(login_response.status_code, 200)
		token = login_response.json()["access"]
		client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {token}"
		return client

	def test_daily_tasks_default_to_discipline_when_focus_not_set(self):
		tasks = list(get_daily_tasks(self.user))
		self.assertEqual(len(tasks), DAILY_TASK_COUNT)
		self.assertTrue(all(task.task.category == "discipline" for task in tasks))

	def test_update_focus_reassigns_incomplete_tasks_and_preserves_completed(self):
		today = timezone.localdate()
		initial_tasks = list(get_daily_tasks(self.user, today))
		self.assertEqual(len(initial_tasks), DAILY_TASK_COUNT)

		completed_task = initial_tasks[0]
		completed_task.completed = True
		completed_task.completed_at = timezone.now()
		completed_task.save(update_fields=["completed", "completed_at"])

		client = self._auth_client()
		update_response = client.patch(
			reverse("user-update-focus"),
			data=json.dumps({"focus_category": "study"}),
			content_type="application/json",
		)
		self.assertEqual(update_response.status_code, 200)
		self.user.refresh_from_db()
		self.assertEqual(self.user.focus_category, "study")

		tasks_after = list(get_daily_tasks(self.user, today))
		self.assertEqual(len(tasks_after), DAILY_TASK_COUNT)

		completed_after = [task for task in tasks_after if task.completed]
		incomplete_after = [task for task in tasks_after if not task.completed]

		self.assertEqual(len(completed_after), 1)
		self.assertEqual(str(completed_after[0].id), str(completed_task.id))
		self.assertTrue(all(task.task.category == "study" for task in incomplete_after))

from .models import CoachInvite, User

class CoachClientTests(TestCase):
    def setUp(self):
        self.coach_email = 'coach@example.com'
        self.coach = get_user_model().objects.create_user(
            username=self.coach_email,
            email=self.coach_email,
            password='Password123!',
            name='The Coach',
            is_coach=True,
        )
        self.invite = CoachInvite.objects.create(coach=self.coach, code='INVITE123')
        self.register_url = reverse('auth-register')

    def test_register_with_valid_invite_code_sets_coach(self):
        response = self.client.post(
            self.register_url,
            data=json.dumps({
                'name': 'Client One',
                'email': 'client1@example.com',
                'password': 'Password123!',
                'invite_code': 'INVITE123',
            }),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 201)
        user = User.objects.get(email='client1@example.com')
        self.assertEqual(user.coach, self.coach)
        self.invite.refresh_from_db()
        self.assertEqual(self.invite.use_count, 1)

    def test_register_without_invite_code_fails(self):
        response = self.client.post(
            self.register_url,
            data=json.dumps({
                'name': 'Client Two',
                'email': 'client2@example.com',
                'password': 'Password123!',
            }),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.filter(email='client2@example.com').exists())

    def test_register_with_invalid_invite_code_fails(self):
        response = self.client.post(
            self.register_url,
            data=json.dumps({
                'name': 'Client Three',
                'email': 'client3@example.com',
                'password': 'Password123!',
                'invite_code': 'BADC0DE',
            }),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.filter(email='client3@example.com').exists())

    def test_coach_excluded_from_leaderboard(self):
        # Give coach some XP
        self.coach.xp = 1000
        self.coach.save()
        
        from .services import get_leaderboard
        _, _, total_users = get_leaderboard(period="all_time")
        # Coach should not be in leaderboard
        self.assertEqual(total_users, 0)
        
        # Give client XP
        client = get_user_model().objects.create_user(
            username='c@test.com',
            email='c@test.com',
            password='P',
            name='C',
            xp=500
        )
        entries, _, total_users = get_leaderboard(period="all_time")
        self.assertEqual(total_users, 1)
        self.assertEqual(entries[0]['email'], 'c@test.com')

    def test_coach_endpoints_return_403_for_non_coach(self):
        from rest_framework.test import APIClient
        client_user = get_user_model().objects.create_user(
            username='client@example.com',
            email='client@example.com',
            password='Password123!',
        )
        api_client = APIClient()
        api_client.force_authenticate(user=client_user)
        response = api_client.get(reverse('coach-clients'))
        self.assertEqual(response.status_code, 403)


class WorkoutSystemTests(TestCase):
    def setUp(self):
        self.coach_email = "workoutcoach@example.com"
        self.coach_password = "Password123!"
        self.coach = get_user_model().objects.create_user(
            username=self.coach_email,
            email=self.coach_email,
            password=self.coach_password,
            name="Workout Coach",
            is_coach=True,
        )

        self.client_email = "workoutclient@example.com"
        self.client_password = "Password123!"
        self.client_user = get_user_model().objects.create_user(
            username=self.client_email,
            email=self.client_email,
            password=self.client_password,
            name="Workout Client",
            coach=self.coach,
        )

    def _auth_client(self, email, password):
        from rest_framework.test import APIClient
        login_response = self.client.post(
            reverse("auth-login"),
            data=json.dumps({"username": email, "password": password}),
            content_type="application/json",
        )
        self.assertEqual(login_response.status_code, 200)
        token = login_response.json()["access"]
        
        api_client = APIClient()
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        return api_client

    def test_coach_can_build_and_assign_program(self):
        coach_api = self._auth_client(self.coach_email, self.coach_password)

        # 1. Create Exercise
        ex_res = coach_api.post(
            reverse("coach-exercises"),
            data={"name": "Squat", "description": "Barbell back squat"},
            format="json",
        )
        self.assertEqual(ex_res.status_code, 201)
        ex_id = ex_res.json()["id"]

        # 2. Create Program
        prog_res = coach_api.post(
            reverse("coach-programs"),
            data={"name": "Strength Block 1"},
            format="json",
        )
        self.assertEqual(prog_res.status_code, 201)
        prog_id = prog_res.json()["id"]

        # 3. Create WorkoutDay (Monday)
        day_res = coach_api.post(
            reverse("coach-program-day-create", kwargs={"pk": prog_id}),
            data={"weekday": 0, "title": "Heavy Lower"},
            format="json",
        )
        self.assertEqual(day_res.status_code, 201)
        day_id = day_res.json()["id"]

        # 4. Attach Exercise
        wde_res = coach_api.post(
            reverse(
                "coach-program-day-exercise-create",
                kwargs={"pk": prog_id, "day_id": day_id}
            ),
            data={
                "exercise_id": ex_id,
                "prescribed_sets": 3,
                "prescribed_reps": "5",
                "notes": "RPE 8",
            },
            format="json",
        )
        self.assertEqual(wde_res.status_code, 201)

        # 5. Assign to Client
        assign_res = coach_api.post(
            reverse("coach-client-assign-program", kwargs={"client_id": self.client_user.id}),
            data={"program_id": prog_id},
            format="json",
        )
        self.assertEqual(assign_res.status_code, 201)
        
        # Verify assignment is active
        from .models import ProgramAssignment
        assignment = ProgramAssignment.objects.get(id=assign_res.json()["id"])
        self.assertTrue(assignment.is_active)
        self.assertEqual(assignment.client, self.client_user)
        self.assertEqual(str(assignment.program.id), prog_id)

    def test_client_workout_today_and_submit(self):
        # Setup: Coach builds program and assigns it, targeting today
        from .models import Exercise, Program, WorkoutDay, WorkoutDayExercise, ProgramAssignment
        ex = Exercise.objects.create(coach=self.coach, name="Pushup")
        prog = Program.objects.create(coach=self.coach, name="Bodyweight")
        
        today = timezone.localdate()
        day = WorkoutDay.objects.create(program=prog, weekday=today.weekday(), title="Full Body")
        wde = WorkoutDayExercise.objects.create(workout_day=day, exercise=ex, prescribed_sets=3, prescribed_reps="10")
        
        ProgramAssignment.objects.create(
            client=self.client_user, program=prog, assigned_by=self.coach, start_date=today, is_active=True
        )

        client_api = self._auth_client(self.client_email, self.client_password)

        # 1. Get Today's Workout
        today_res = client_api.get(reverse("workout-today"))
        self.assertEqual(today_res.status_code, 200)
        data = today_res.json()
        self.assertFalse(data["rest_day"])
        self.assertTrue(data["has_active_program"])
        
        workout_log = data["workout_log"]
        self.assertFalse(workout_log["completed"])
        self.assertEqual(len(workout_log["exercise_logs"]), 1)
        
        log_id = workout_log["id"]
        wde_id = workout_log["exercise_logs"][0]["workout_day_exercise_id"]

        # 2. Submit Workout
        submit_res = client_api.post(
            reverse("workout-submit"),
            data={
                "workout_log_id": log_id,
                "exercises": [
                    {
                        "workout_day_exercise_id": wde_id,
                        "completed": True,
                        "actual_reps": "12",
                    }
                ]
            },
            format="json",
        )
        self.assertEqual(submit_res.status_code, 200)
        submit_data = submit_res.json()
        self.assertTrue(submit_data["success"])
        self.assertEqual(submit_data["xp_awarded"], 35) # WORKOUT_XP_AMOUNT
        self.assertTrue(submit_data["workout_log"]["completed"])
        self.assertTrue(submit_data["workout_log"]["exercise_logs"][0]["completed"])
        self.assertEqual(submit_data["workout_log"]["exercise_logs"][0]["actual_reps"], "12")
        
        # Verify user XP increased
        self.client_user.refresh_from_db()
        self.assertEqual(self.client_user.xp, 35)

        # 3. Submit Again - Should not award XP twice
        submit_res_2 = client_api.post(
            reverse("workout-submit"),
            data={
                "workout_log_id": log_id,
                "exercises": [
                    {
                        "workout_day_exercise_id": wde_id,
                        "completed": True,
                        "actual_reps": "15",
                    }
                ]
            },
            format="json",
        )
        self.assertEqual(submit_res_2.status_code, 200)
        submit_data_2 = submit_res_2.json()
        self.assertEqual(submit_data_2["xp_awarded"], 0) # No extra XP
        self.assertEqual(submit_data_2["workout_log"]["exercise_logs"][0]["actual_reps"], "15")

        self.client_user.refresh_from_db()
        self.assertEqual(self.client_user.xp, 35) # Still 35

    def test_client_workout_today_rest_day(self):
        from .models import Program, ProgramAssignment
        prog = Program.objects.create(coach=self.coach, name="Rest Program")
        today = timezone.localdate()
        # Create a program but NO WorkoutDay for today's weekday
        ProgramAssignment.objects.create(
            client=self.client_user, program=prog, assigned_by=self.coach, start_date=today, is_active=True
        )

        client_api = self._auth_client(self.client_email, self.client_password)
        today_res = client_api.get(reverse("workout-today"))
        self.assertEqual(today_res.status_code, 200)
        data = today_res.json()
        self.assertTrue(data["rest_day"])
        self.assertTrue(data["has_active_program"])

    def test_client_workout_today_no_program(self):
        client_api = self._auth_client(self.client_email, self.client_password)
        today_res = client_api.get(reverse("workout-today"))
        self.assertEqual(today_res.status_code, 200)
        data = today_res.json()
        self.assertTrue(data["rest_day"])
        self.assertFalse(data["has_active_program"])


class BodyMetricsTests(TestCase):
    def setUp(self):
        from rest_framework.test import APIClient
        
        self.coach_email = "bmcoach@example.com"
        self.coach_password = "Password123!"
        self.coach = get_user_model().objects.create_user(
            username=self.coach_email,
            email=self.coach_email,
            password=self.coach_password,
            name="Metrics Coach",
            is_coach=True,
        )

        self.client_email = "bmclient@example.com"
        self.client_password = "Password123!"
        self.client_user = get_user_model().objects.create_user(
            username=self.client_email,
            email=self.client_email,
            password=self.client_password,
            name="Metrics Client",
            coach=self.coach,
        )

        self.other_client = get_user_model().objects.create_user(
            username="other@example.com",
            email="other@example.com",
            password="Password123!",
            name="Other Client",
        )

        self.other_coach = get_user_model().objects.create_user(
            username="othercoach@example.com",
            email="othercoach@example.com",
            password="Password123!",
            name="Other Coach",
            is_coach=True,
        )

    def _auth_client(self, email, password):
        from rest_framework.test import APIClient
        api_client = APIClient()
        res = api_client.post(
            reverse("auth-login"),
            data={"username": email, "password": password},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")
        return api_client

    def test_new_client_auto_subscribed_to_weight(self):
        from .models import MetricDefinition, ClientMetricSubscription
        from .models import CoachInvite
        
        # Test the registration flow hooks
        invite = CoachInvite.objects.create(coach=self.coach, code='BM_INVITE')
        api = self._auth_client(self.client_email, self.client_password)
        
        # We need an unauthenticated client for registration
        from rest_framework.test import APIClient
        anon_api = APIClient()
        res = anon_api.post(reverse("auth-register"), data={
            "name": "New Reg Client",
            "email": "newreg@example.com",
            "password": "Password123!",
            "invite_code": "BM_INVITE",
        }, format="json")
        
        self.assertEqual(res.status_code, 201)
        new_user = get_user_model().objects.get(email="newreg@example.com")
        
        weight_metric = MetricDefinition.objects.get(coach=self.coach, is_default_weight=True)
        sub = ClientMetricSubscription.objects.get(client=new_user, metric_definition=weight_metric)
        self.assertTrue(sub.is_active)

    def test_coach_create_custom_metric(self):
        coach_api = self._auth_client(self.coach_email, self.coach_password)
        res = coach_api.post(reverse("coach-metric-definitions"), data={
            "name": "Body Fat",
            "unit": "%"
        }, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["name"], "Body Fat")
        self.assertEqual(res.data["unit"], "%")

    def test_client_submit_checkin_creates_entry(self):
        from .models import MetricDefinition
        weight = MetricDefinition.ensure_default_weight(self.coach)
        
        client_api = self._auth_client(self.client_email, self.client_password)
        res = client_api.post(reverse("metric-entries"), data={
            "values": [{"metric_definition_id": str(weight.id), "value": 85.5}]
        }, format="json")
        
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data["values"]), 1)
        self.assertEqual(res.data["values"][0]["value"], 85.5)

    def test_client_resubmit_same_date_updates(self):
        from .models import MetricDefinition, BodyMetricEntry
        weight = MetricDefinition.ensure_default_weight(self.coach)
        
        client_api = self._auth_client(self.client_email, self.client_password)
        client_api.post(reverse("metric-entries"), data={
            "values": [{"metric_definition_id": str(weight.id), "value": 85.5}]
        }, format="json")
        
        # Resubmit same date (today default)
        client_api.post(reverse("metric-entries"), data={
            "values": [{"metric_definition_id": str(weight.id), "value": 84.0}]
        }, format="json")
        
        # Should only be 1 entry
        entries = BodyMetricEntry.objects.filter(user=self.client_user)
        self.assertEqual(entries.count(), 1)
        self.assertEqual(entries.first().values.first().value, 84.0)

    def test_client_upload_photo(self):
        import io
        from django.core.files.uploadedfile import SimpleUploadedFile
        from .models import ProgressPhoto
        
        client_api = self._auth_client(self.client_email, self.client_password)
        
        # Create dummy image
        image_content = b"fake_image_data"
        image = SimpleUploadedFile("front.jpg", image_content, content_type="image/jpeg")
        
        res = client_api.post(reverse("metric-photos"), data={
            "image": image,
            "angle": "front"
        }, format="multipart")
        
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["angle"], "front")
        self.assertEqual(ProgressPhoto.objects.filter(user=self.client_user).count(), 1)

    def test_client_photo_retrievable(self):
        import io
        from django.core.files.uploadedfile import SimpleUploadedFile
        client_api = self._auth_client(self.client_email, self.client_password)
        image = SimpleUploadedFile("front.jpg", b"fake", content_type="image/jpeg")
        client_api.post(reverse("metric-photos"), data={"image": image}, format="multipart")
        
        res = client_api.get(reverse("metric-photos"))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data["photos"]), 1)

    def test_privacy_other_client_cannot_access(self):
        import io
        from django.core.files.uploadedfile import SimpleUploadedFile
        client_api = self._auth_client(self.client_email, self.client_password)
        image = SimpleUploadedFile("front.jpg", b"fake", content_type="image/jpeg")
        photo_res = client_api.post(reverse("metric-photos"), data={"image": image}, format="multipart")
        photo_id = photo_res.data["id"]

        other_client_api = self._auth_client("other@example.com", "Password123!")
        
        # Other client's photos should be empty
        res = other_client_api.get(reverse("metric-photos"))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data["photos"]), 0)

        # Other client trying to delete first client's photo
        del_res = other_client_api.delete(reverse("metric-photo-detail", kwargs={"pk": photo_id}))
        self.assertEqual(del_res.status_code, 404)

    def test_privacy_unrelated_coach_cannot_access(self):
        other_coach_api = self._auth_client("othercoach@example.com", "Password123!")
        res = other_coach_api.get(reverse("coach-client-metric-entries", kwargs={"client_id": str(self.client_user.id)}))
        self.assertEqual(res.status_code, 404)

    def test_own_coach_can_access(self):
        coach_api = self._auth_client(self.coach_email, self.coach_password)
        res = coach_api.get(reverse("coach-client-metric-entries", kwargs={"client_id": str(self.client_user.id)}))
        self.assertEqual(res.status_code, 200)
        self.assertIn("metrics", res.data)

    def test_unauthenticated_blocked(self):
        from rest_framework.test import APIClient
        anon_api = APIClient()
        res = anon_api.get(reverse("metric-entries"))
        self.assertEqual(res.status_code, 401)

    def test_body_metrics_not_in_leaderboard(self):
        # Even if a client logs weight, it shouldn't show in leaderboard (which is XP only)
        # Give client XP to show in leaderboard
        self.client_user.xp = 1000
        self.client_user.save()
        
        from .models import MetricDefinition, BodyMetricValue, BodyMetricEntry
        weight = MetricDefinition.ensure_default_weight(self.coach)
        entry = BodyMetricEntry.objects.create(user=self.client_user, date=timezone.localdate())
        BodyMetricValue.objects.create(entry=entry, metric_definition=weight, value=85.0)

        client_api = self._auth_client(self.client_email, self.client_password)
        res = client_api.get(reverse("leaderboard"))
        self.assertEqual(res.status_code, 200)
        
        entries = res.data["entries"]
        self.assertTrue(len(entries) > 0)
        self.assertNotIn("weight", entries[0])
        self.assertNotIn("body_metrics", entries[0])


class ClientGroupTests(TestCase):
    """Tests for client grouping/cohorts (Phase 6)."""

    def setUp(self):
        from .models import CoachInvite, Program
        self.coach_email = "coach@groups.com"
        self.coach_password = "Password123!"
        self.coach = get_user_model().objects.create_user(
            username=self.coach_email,
            email=self.coach_email,
            password=self.coach_password,
            name="GroupCoach",
            is_coach=True,
        )
        # Create 3 client users under this coach
        self.clients = []
        for i in range(3):
            email = f"client{i}@groups.com"
            u = get_user_model().objects.create_user(
                username=email,
                email=email,
                password="Password123!",
                name=f"Client {i}",
                coach=self.coach,
            )
            self.clients.append(u)

        # Create a program for bulk assignment testing
        self.program = Program.objects.create(
            coach=self.coach,
            name="Test Program",
        )

    def _auth_coach(self):
        from rest_framework.test import APIClient
        api = APIClient()
        api.force_authenticate(user=self.coach)
        return api

    def _auth_client_user(self, user):
        from rest_framework.test import APIClient
        api = APIClient()
        api.force_authenticate(user=user)
        return api

    def test_create_group_and_add_clients(self):
        api = self._auth_coach()
        # Create group
        res = api.post(reverse("coach-groups"), data={
            "name": "Spring Shred Cohort",
            "description": "Q2 shred clients",
        }, format="json")
        self.assertEqual(res.status_code, 201)
        group_id = res.data["id"]
        self.assertEqual(res.data["name"], "Spring Shred Cohort")

        # Add 2 clients
        res = api.post(
            reverse("coach-group-members-add", kwargs={"pk": group_id}),
            data={"client_ids": [str(self.clients[0].id), str(self.clients[1].id)]},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["added_count"], 2)

        # Verify group detail shows 2 members
        res = api.get(reverse("coach-group-detail", kwargs={"pk": group_id}))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["member_count"], 2)

    def test_moving_client_between_groups(self):
        from .models import ClientGroup
        api = self._auth_coach()

        # Create two groups
        res_a = api.post(reverse("coach-groups"), data={"name": "Group A"}, format="json")
        res_b = api.post(reverse("coach-groups"), data={"name": "Group B"}, format="json")
        group_a_id = res_a.data["id"]
        group_b_id = res_b.data["id"]

        # Add client 0 to Group A
        api.post(
            reverse("coach-group-members-add", kwargs={"pk": group_a_id}),
            data={"client_ids": [str(self.clients[0].id)]},
            format="json",
        )
        self.clients[0].refresh_from_db()
        self.assertEqual(str(self.clients[0].client_group_id), group_a_id)

        # Move client 0 to Group B (just reassign FK)
        api.post(
            reverse("coach-group-members-add", kwargs={"pk": group_b_id}),
            data={"client_ids": [str(self.clients[0].id)]},
            format="json",
        )
        self.clients[0].refresh_from_db()
        self.assertEqual(str(self.clients[0].client_group_id), group_b_id)

        # Group A should have 0 members, Group B should have 1
        res_a = api.get(reverse("coach-group-detail", kwargs={"pk": group_a_id}))
        self.assertEqual(res_a.data["member_count"], 0)
        res_b = api.get(reverse("coach-group-detail", kwargs={"pk": group_b_id}))
        self.assertEqual(res_b.data["member_count"], 1)

    def test_assign_program_to_group_creates_per_client_assignments(self):
        from .models import ProgramAssignment
        api = self._auth_coach()

        # Create group with 2 clients
        res = api.post(reverse("coach-groups"), data={"name": "Prog Group"}, format="json")
        group_id = res.data["id"]
        api.post(
            reverse("coach-group-members-add", kwargs={"pk": group_id}),
            data={"client_ids": [str(c.id) for c in self.clients[:2]]},
            format="json",
        )

        # Bulk assign program
        res = api.post(
            reverse("coach-group-assign-program", kwargs={"pk": group_id}),
            data={"program_id": str(self.program.id)},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["assigned_count"], 2)

        # Each client should have an active ProgramAssignment
        for c in self.clients[:2]:
            self.assertTrue(
                ProgramAssignment.objects.filter(
                    client=c, program=self.program, is_active=True,
                ).exists()
            )

        # Previous active assignment deactivation check: assign again
        from .models import Program
        program2 = Program.objects.create(coach=self.coach, name="Program 2")
        res = api.post(
            reverse("coach-group-assign-program", kwargs={"pk": group_id}),
            data={"program_id": str(program2.id)},
            format="json",
        )
        self.assertEqual(res.data["assigned_count"], 2)
        # Original assignment should be deactivated for each client
        for c in self.clients[:2]:
            old = ProgramAssignment.objects.filter(
                client=c, program=self.program,
            ).first()
            self.assertFalse(old.is_active)
            new = ProgramAssignment.objects.filter(
                client=c, program=program2, is_active=True,
            ).first()
            self.assertIsNotNone(new)

    def test_assign_task_to_group_creates_per_client_tasks(self):
        from .models import UserTask
        api = self._auth_coach()

        # Create group with all 3 clients
        res = api.post(reverse("coach-groups"), data={"name": "Task Group"}, format="json")
        group_id = res.data["id"]
        api.post(
            reverse("coach-group-members-add", kwargs={"pk": group_id}),
            data={"client_ids": [str(c.id) for c in self.clients]},
            format="json",
        )

        # Bulk assign task
        res = api.post(
            reverse("coach-group-assign-task", kwargs={"pk": group_id}),
            data={"title": "Do 50 pushups", "category": "fitness"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["assigned_count"], 3)

        # Each client should have the task
        for c in self.clients:
            self.assertTrue(
                UserTask.objects.filter(
                    user=c, custom_title="Do 50 pushups",
                ).exists()
            )

    def test_client_added_after_assignment_does_not_retroactively_receive(self):
        from .models import ProgramAssignment, UserTask
        api = self._auth_coach()

        # Create group with 2 clients, leave client[2] out
        res = api.post(reverse("coach-groups"), data={"name": "Early Group"}, format="json")
        group_id = res.data["id"]
        api.post(
            reverse("coach-group-members-add", kwargs={"pk": group_id}),
            data={"client_ids": [str(c.id) for c in self.clients[:2]]},
            format="json",
        )

        # Bulk assign program & task
        api.post(
            reverse("coach-group-assign-program", kwargs={"pk": group_id}),
            data={"program_id": str(self.program.id)},
            format="json",
        )
        api.post(
            reverse("coach-group-assign-task", kwargs={"pk": group_id}),
            data={"title": "Run 5k"},
            format="json",
        )

        # Now add client[2] to the group AFTER assignment
        api.post(
            reverse("coach-group-members-add", kwargs={"pk": group_id}),
            data={"client_ids": [str(self.clients[2].id)]},
            format="json",
        )

        # client[2] should NOT have the program or task
        self.assertFalse(
            ProgramAssignment.objects.filter(client=self.clients[2]).exists()
        )
        self.assertFalse(
            UserTask.objects.filter(user=self.clients[2], custom_title="Run 5k").exists()
        )

    def test_deleting_group_clears_membership_preserves_assignments(self):
        from .models import ProgramAssignment
        api = self._auth_coach()

        # Create group, add clients, assign program
        res = api.post(reverse("coach-groups"), data={"name": "Doomed Group"}, format="json")
        group_id = res.data["id"]
        api.post(
            reverse("coach-group-members-add", kwargs={"pk": group_id}),
            data={"client_ids": [str(c.id) for c in self.clients[:2]]},
            format="json",
        )
        api.post(
            reverse("coach-group-assign-program", kwargs={"pk": group_id}),
            data={"program_id": str(self.program.id)},
            format="json",
        )

        # Delete the group
        res = api.delete(reverse("coach-group-detail", kwargs={"pk": group_id}))
        self.assertEqual(res.status_code, 204)

        # Members' client_group should be null
        for c in self.clients[:2]:
            c.refresh_from_db()
            self.assertIsNone(c.client_group)

        # But their ProgramAssignment should still exist
        for c in self.clients[:2]:
            self.assertTrue(
                ProgramAssignment.objects.filter(
                    client=c, program=self.program,
                ).exists()
            )

    def test_non_coach_gets_403_on_group_endpoints(self):
        from rest_framework.test import APIClient
        non_coach_api = APIClient()
        non_coach_api.force_authenticate(user=self.clients[0])

        res = non_coach_api.get(reverse("coach-groups"))
        self.assertEqual(res.status_code, 403)

        res = non_coach_api.post(
            reverse("coach-groups"),
            data={"name": "Hacker Group"},
            format="json",
        )
        self.assertEqual(res.status_code, 403)

    def test_coach_cannot_access_other_coaches_group(self):
        from rest_framework.test import APIClient
        from .models import ClientGroup
        # Create another coach
        other_coach = get_user_model().objects.create_user(
            username="other_coach@groups.com",
            email="other_coach@groups.com",
            password="Password123!",
            name="Other Coach",
            is_coach=True,
        )
        other_api = APIClient()
        other_api.force_authenticate(user=other_coach)

        # First coach creates a group
        api = self._auth_coach()
        res = api.post(reverse("coach-groups"), data={"name": "My Group"}, format="json")
        group_id = res.data["id"]

        # Other coach tries to access it
        res = other_api.get(reverse("coach-group-detail", kwargs={"pk": group_id}))
        self.assertEqual(res.status_code, 404)

    def test_roster_includes_group_and_filter_works(self):
        api = self._auth_coach()

        # Create group and add 1 client
        res = api.post(reverse("coach-groups"), data={"name": "Filter Test"}, format="json")
        group_id = res.data["id"]
        api.post(
            reverse("coach-group-members-add", kwargs={"pk": group_id}),
            data={"client_ids": [str(self.clients[0].id)]},
            format="json",
        )

        # Fetch roster without filter — should have all 3
        res = api.get(reverse("coach-clients"))
        self.assertEqual(len(res.data), 3)
        # The grouped client should have client_group populated
        grouped = next(c for c in res.data if c["id"] == str(self.clients[0].id))
        self.assertIsNotNone(grouped["client_group"])
        self.assertEqual(grouped["client_group"]["name"], "Filter Test")

        # Fetch roster with group filter — should have only 1
        res = api.get(reverse("coach-clients") + f"?group={group_id}")
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["id"], str(self.clients[0].id))
