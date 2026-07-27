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
