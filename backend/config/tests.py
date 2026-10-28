from pathlib import Path
from tempfile import TemporaryDirectory

from django.core.management import call_command
from django.test import Client, SimpleTestCase, TestCase, override_settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group


class HealthTests(SimpleTestCase):
    def test_health_endpoint(self):
        response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")


class FrontendHostingTests(TestCase):
    def setUp(self):
        user = get_user_model().objects.create_user(username='hosting')
        user.groups.add(Group.objects.create(name='benevole'))
        self.client.force_login(user)
        self.directory = TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.dist = Path(self.directory.name) / 'dist'
        self.assets = self.dist / 'planning' / 'assets'
        self.assets.mkdir(parents=True)
        self.static_root = Path(self.directory.name) / 'staticfiles'
        self.static_root.mkdir()
        self.html = '<html><script src="/static/planning/assets/app.js"></script></html>'
        (self.dist / 'index.html').write_text(self.html, encoding='utf-8')
        (self.assets / 'app.js').write_text('console.log("planning")', encoding='utf-8')
        self.override = override_settings(
            FRONTEND_DIST=self.dist, STATIC_ROOT=self.static_root,
            STATICFILES_DIRS=[self.dist],
        )
        self.override.enable()
        self.addCleanup(self.override.disable)

    def test_root_redirect_and_entry_point(self):
        self.assertRedirects(self.client.get('/'), '/admin/planning/')
        self.assertRedirects(self.client.get('/planning/'), '/admin/planning/')
        response = self.client.get('/admin/planning/')
        self.assertContains(response, self.html)
        self.assertIn('no-store', response['Cache-Control'])
        self.assertEqual(self.client.head('/admin/planning/').status_code, 200)
        self.assertEqual(self.client.post('/admin/planning/').status_code, 405)

    def test_missing_build_has_actionable_error(self):
        (self.dist / 'index.html').unlink()
        response = self.client.get('/admin/planning/')
        self.assertContains(response, 'npm.cmd run build', status_code=503)

    @override_settings(DEBUG=True)
    def test_assets_served_in_development(self):
        response = self.client.get('/static/planning/assets/app.js')
        self.assertEqual(response.status_code, 200)
        self.assertIn('javascript', response['Content-Type'])
        self.assertEqual(b''.join(response.streaming_content), b'console.log("planning")')

    @override_settings(DEBUG=False, WHITENOISE_USE_FINDERS=False, WHITENOISE_AUTOREFRESH=False)
    def test_collected_assets_served_without_debug(self):
        call_command('collectstatic', interactive=False, verbosity=0)
        response = Client().get('/static/planning/assets/app.js')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(b''.join(response.streaming_content), b'console.log("planning")')
        admin_css = Client().get('/static/admin/css/base.css')
        self.assertEqual(admin_css.status_code, 200)
        admin_css.close()

    def test_admin_api_and_unknown_routes_are_not_spa_fallbacks(self):
        self.assertEqual(Client().get('/admin/login/').status_code, 200)
        self.assertEqual(self.client.get('/api/health/').json()['status'], 'ok')
        for path in ['/api/unknown/', '/planning/unknown/', '/static/planning/assets/missing.js']:
            self.assertEqual(self.client.get(path).status_code, 404)
