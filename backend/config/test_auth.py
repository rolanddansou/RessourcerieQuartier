from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import Client, TestCase


class SharedLoginTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        group = Group.objects.create(name='benevole')
        cls.volunteer = get_user_model().objects.create_user(username='volunteer', password='SharedPassword!294')
        cls.volunteer.groups.add(group)
        cls.admin = get_user_model().objects.create_superuser(username='administrator', password='SharedPassword!294')
        cls.outsider = get_user_model().objects.create_user(username='outsider', password='SharedPassword!294')
        cls.inactive = get_user_model().objects.create_user(username='inactive', password='SharedPassword!294', is_active=False)
        cls.inactive.groups.add(group)

    def login(self, username, target=None):
        data = {'username': username, 'password': 'SharedPassword!294'}
        if target is not None:
            data['next'] = target
        return self.client.post('/admin/login/', data)

    def test_volunteer_uses_admin_form_without_becoming_staff(self):
        page = self.client.get('/admin/login/?next=/admin/')
        self.assertTemplateUsed(page, 'admin/login.html')
        response = self.login('volunteer', '/admin/')
        self.assertEqual(response.url, '/admin/planning/')
        self.volunteer.refresh_from_db()
        self.assertFalse(self.volunteer.is_staff)
        self.assertFalse(self.volunteer.is_superuser)
        self.assertEqual(self.client.get('/api/planning/session/').json()['user']['roles'], ['benevole'])
        self.assertEqual(self.client.get('/api/planning/volunteers/').status_code, 403)
        for path in ['/admin/', '/admin/auth/user/', '/admin/auth/group/']:
            self.assertEqual(self.client.get(path).status_code, 302)
        self.assertEqual(self.client.get('/admin/login/?next=/admin/auth/user/').url, '/admin/planning/')

    def test_admin_keeps_normal_permissions_and_safe_next(self):
        self.assertEqual(self.login('administrator').url, '/admin/')
        self.assertEqual(self.client.get('/admin/').status_code, 200)
        self.assertContains(self.client.get('/admin/'), 'href="/admin/planning/"')
        self.client.logout()
        self.assertEqual(self.login('administrator', '/admin/planning/').url, '/admin/planning/')

    def test_redirect_destinations_cannot_escape_or_grant_access(self):
        for username in ['volunteer', 'administrator']:
            for target in ['https://evil.example/', '//evil.example/', '/admin/login/', '/admin/logout/']:
                with self.subTest(username=username, target=target):
                    self.client.logout()
                    expected = '/admin/' if username == 'administrator' else '/admin/planning/'
                    self.assertEqual(self.login(username, target).url, expected)

    def test_anonymous_page_redirects_and_api_stays_json(self):
        self.assertEqual(self.client.get('/admin/planning/').url, '/admin/login/?next=/admin/planning/')
        self.assertEqual(self.client.get('/api/planning/weeks/?week=2026-10-26').status_code, 401)
        self.assertContains(self.client.get('/admin/login/?expired=1'), 'Votre session a expiré')

    def test_inactive_or_unassigned_users_cannot_login(self):
        for username in ['outsider', 'inactive']:
            response = self.login(username)
            self.assertEqual(response.status_code, 200)
            self.assertTrue(response.context['form'].errors)
            self.assertNotIn('_auth_user_id', self.client.session)

    def test_roles_checked_again_on_each_page(self):
        self.client.force_login(self.outsider)
        self.assertEqual(self.client.get('/admin/planning/').status_code, 403)
        self.client.force_login(self.volunteer)
        self.volunteer.groups.clear()
        self.assertEqual(self.client.get('/admin/planning/').status_code, 403)
        self.assertEqual(self.client.get('/api/planning/availabilities/?week=2026-10-26').status_code, 403)

    def test_common_login_requires_csrf_and_logout_ends_shared_session(self):
        client = Client(enforce_csrf_checks=True)
        credentials = {'username': 'volunteer', 'password': 'SharedPassword!294'}
        self.assertEqual(client.post('/admin/login/', credentials).status_code, 403)
        client.get('/admin/login/')
        response = client.post('/admin/login/', credentials, HTTP_X_CSRFTOKEN=client.cookies['csrftoken'].value)
        self.assertEqual(response.status_code, 302)
        self.assertEqual(client.get('/api/planning/session/').json()['user']['id'], str(self.volunteer.pk))
        self.assertEqual(client.post('/api/planning/logout/', HTTP_X_CSRFTOKEN=client.cookies['csrftoken'].value).status_code, 200)
        self.assertIsNone(client.get('/api/planning/session/').json()['user'])
