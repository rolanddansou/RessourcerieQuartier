import json
from datetime import date, time
from io import StringIO
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import Client, TestCase, override_settings

from .models import Assignment, Availability, WeeklyPlanning
from .services import delete_availability, save_assignment, save_availability
from .users import Identity


class FakeDirectory:
    def current(self, request):
        return Identity('external:abc', 'Utilisateur externe', ('benevole',), True)

    def volunteers(self):
        return [self.current(None)]


class PlanningTests(TestCase):
    def setUp(self):
        group = Group.objects.create(name='benevole')
        self.volunteer = get_user_model().objects.create_user(username='alice', password='Strong!testPassword1')
        self.volunteer.groups.add(group)
        self.other = get_user_model().objects.create_user(username='bob', password='Strong!testPassword2')
        self.other.groups.add(group)
        self.admin = get_user_model().objects.create_superuser(username='admin', password='Strong!testPassword3')
        self.ref = str(self.volunteer.pk)
        self.people = [Identity(self.ref, 'Alice', ('benevole',), True)]
        self.week = WeeklyPlanning.objects.create(week=date(2026, 10, 26))
        self.data = {'date': date(2026, 10, 27), 'start': time(9), 'end': time(12), 'details': ''}
        self.slot = save_availability(self.ref, self.data)

    def assignment(self, **changes):
        data = {'user_ref': self.ref, 'date': self.data['date'], 'start': time(9), 'end': time(10), 'note': ''}
        data.update(changes)
        return save_assignment(self.week.pk, data, self.people)

    def request(self, path, method='get', data=None):
        return getattr(self.client, method)('/api/planning/' + path, data=json.dumps(data if data is not None else {}), content_type='application/json') if method != 'get' else self.client.get('/api/planning/' + path)

    def test_invalid_duration_and_overnight(self):
        for end in [time(9), time(8)]:
            with self.assertRaises(ValidationError):
                save_availability(self.ref, {**self.data, 'end': end})
            with self.assertRaises(ValidationError):
                self.assignment(end=end)

    def test_availability_overlap_and_adjacent(self):
        with self.assertRaises(ValidationError):
            save_availability(self.ref, {**self.data, 'start': time(11), 'end': time(13)})
        save_availability(self.ref, {**self.data, 'start': time(12), 'end': time(13)})
        save_availability(str(self.other.pk), self.data)

    def test_assignment_coverage_and_week_and_active_user(self):
        for changes in [{'start': time(8)}, {'end': time(13)}, {'date': date(2026, 11, 3)}, {'user_ref': 'unknown'}]:
            with self.assertRaises(ValidationError):
                self.assignment(**changes)
        with self.assertRaises(ValidationError):
            save_assignment(self.week.pk, {'user_ref': self.ref, 'date': self.data['date'], 'start': time(9), 'end': time(10), 'note': ''}, [Identity(self.ref, 'Alice', ('benevole',), False)])

    def test_assignment_overlap_adjacent_and_update(self):
        item = self.assignment()
        with self.assertRaises(ValidationError):
            self.assignment(start=time(9, 30), end=time(11))
        self.assignment(start=time(10), end=time(11))
        save_assignment(self.week.pk, {'user_ref': self.ref, 'date': self.data['date'], 'start': time(9), 'end': time(10), 'note': 'Mise à jour'}, self.people, item.pk)
        item.refresh_from_db()
        self.assertEqual(item.note, 'Mise à jour')

    def test_used_availability_protected_even_in_draft(self):
        self.assignment()
        for changes in [{'start': time(9, 30)}, {'date': date(2026, 10, 28)}, {'end': time(9, 30)}]:
            with self.assertRaises(ValidationError):
                save_availability(self.ref, {**self.data, **changes}, self.slot.pk)
        with self.assertRaises(ValidationError):
            delete_availability(self.ref, self.slot.pk)
        save_availability(self.ref, {**self.data, 'start': time(8), 'details': 'Nouvelle note'}, self.slot.pk)
        Assignment.objects.all().delete()
        delete_availability(self.ref, self.slot.pk)

    def test_anonymous_and_methods(self):
        self.assertEqual(self.request('weeks/?week=2026-10-26').status_code, 401)
        self.assertEqual(self.request('volunteers/').status_code, 401)
        self.assertEqual(self.request('session/').status_code, 200)
        self.client.force_login(self.volunteer)
        self.assertEqual(self.request('weeks/', 'delete').status_code, 405)

    def test_permissions_and_owner_isolation(self):
        self.client.force_login(self.other)
        self.assertEqual(self.request('availabilities/?week=2026-10-26').json()['items'], [])
        for method in ['put', 'delete']:
            self.assertEqual(self.request(f'availabilities/{self.slot.pk}/', method, {'date': '2026-10-27', 'start': '09:00', 'end': '12:00'}).status_code, 404)
        for path, method, data in [('volunteers/', 'get', None), ('team-availabilities/?week=2026-10-26', 'get', None), ('weeks/', 'post', {'week': '2026-10-26'}), (f'weeks/{self.week.pk}/publication/', 'post', {'published': True}), (f'weeks/{self.week.pk}/assignments/', 'post', {})]:
            self.assertEqual(self.request(path, method, data).status_code, 403)
        self.client.force_login(self.admin)
        self.assertEqual(self.request('availabilities/?week=2026-10-26').status_code, 403)

    def test_create_availability_cannot_spoof_owner(self):
        self.client.force_login(self.other)
        response = self.request('availabilities/', 'post', {'date': '2026-10-27', 'start': '09:00', 'end': '10:00', 'user_ref': self.ref})
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['user_ref'], str(self.other.pk))

    def test_publish_unpublish_and_immediate_edits(self):
        item = self.assignment()
        self.client.force_login(self.volunteer)
        self.assertEqual(self.request('weeks/?week=2026-10-26').json()['items'], [])
        self.client.force_login(self.admin)
        self.assertEqual(len(self.request('weeks/?week=2026-10-26').json()['items']), 1)
        self.assertEqual(self.request(f'weeks/{self.week.pk}/publication/', 'post', {'published': True}).status_code, 200)
        response = self.request(f'weeks/{self.week.pk}/assignments/{item.pk}/', 'put', {'user_ref': self.ref, 'date': '2026-10-27', 'start': '10:00', 'end': '11:00', 'note': 'Modifié'})
        self.assertEqual(response.status_code, 200)
        self.client.force_login(self.other)
        result = self.request('weeks/?week=2026-10-26').json()['items'][0]
        self.assertEqual(result['assignments'][0]['note'], 'Modifié')
        self.assertEqual(result['assignments'][0]['name'], 'alice')
        self.client.force_login(self.admin)
        self.request(f'weeks/{self.week.pk}/publication/', 'post', {'published': False})
        self.client.force_login(self.volunteer)
        self.assertEqual(self.request('weeks/?week=2026-10-26').json()['items'], [])

    def test_week_validation_and_uniqueness(self):
        self.client.force_login(self.admin)
        self.assertEqual(self.request('weeks/', 'post', {'week': '2026-10-27'}).status_code, 400)
        for _ in range(2):
            self.assertEqual(self.request('weeks/', 'post', {'week': '2026-10-26'}).status_code, 200)
        self.assertEqual(WeeklyPlanning.objects.count(), 1)

    def test_bad_input(self):
        self.client.force_login(self.volunteer)
        for data in [{'date': 'bad', 'start': '09:00', 'end': '12:00'}, {'date': '2026-10-28', 'start': '09:00', 'end': '12:00', 'details': 'x' * 2001}, []]:
            self.assertEqual(self.request('availabilities/', 'post', data).status_code, 400)
        self.assertEqual(self.client.post('/api/planning/availabilities/', data='{', content_type='application/json').status_code, 400)

    @override_settings(PLANNING_USER_DIRECTORY='planning.tests.FakeDirectory')
    def test_external_directory_without_django_user(self):
        response = self.request('availabilities/', 'post', {'date': '2026-10-28', 'start': '09:00', 'end': '10:00'})
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['user_ref'], 'external:abc')
        self.assertEqual(self.request('session/').json()['user']['name'], 'Utilisateur externe')

    def test_session_login_logout_and_csrf(self):
        client = Client(enforce_csrf_checks=True)
        self.assertEqual(client.post('/api/planning/login/', data='{}', content_type='application/json').status_code, 403)
        token = client.get('/api/planning/session/').json()['csrf']
        response = client.post('/api/planning/login/', data=json.dumps({'username': 'alice', 'password': 'Strong!testPassword1'}), content_type='application/json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 200)
        token = response.json()['csrf']
        self.assertEqual(client.post('/api/planning/availabilities/', data='{}', content_type='application/json').status_code, 403)
        self.assertEqual(client.post('/api/planning/logout/', HTTP_X_CSRFTOKEN=token).status_code, 200)
        self.assertEqual(client.get('/api/planning/session/').json()['user'], None)

    def test_setup_idempotent_and_no_role_or_inactive(self):
        call_command('setup_planning', verbosity=0)
        call_command('setup_planning', verbosity=0)
        self.assertEqual(Group.objects.filter(name='benevole').count(), 1)
        self.volunteer.groups.clear()
        self.client.force_login(self.volunteer)
        self.assertEqual(self.request('weeks/?week=2026-10-26').status_code, 403)
        self.volunteer.is_active = False
        self.volunteer.save()
        self.assertEqual(self.request('weeks/?week=2026-10-26').status_code, 401)

    @patch('planning.management.commands.create_planning_demo.getpass', return_value='Demo!ExplicitPassword937')
    def test_demo_command_creates_roles_and_never_replaces(self, getpass):
        for role in ['benevole', 'admin']:
            call_command('create_planning_demo', username=f'demo-{role}', role=role, stdout=StringIO())
            user = get_user_model().objects.get(username=f'demo-{role}')
            self.assertTrue(user.check_password('Demo!ExplicitPassword937'))
            self.assertEqual(user.is_superuser, role == 'admin')
            self.assertEqual(user.groups.filter(name='benevole').exists(), role == 'benevole')
            with self.assertRaises(CommandError):
                call_command('create_planning_demo', username=f'demo-{role}', role=role)

    @patch('planning.management.commands.create_planning_demo.getpass', side_effect=['first', 'different'])
    def test_demo_command_rejects_mismatched_passwords(self, getpass):
        with self.assertRaises(CommandError):
            call_command('create_planning_demo', username='never-created', role='benevole')
        self.assertFalse(get_user_model().objects.filter(username='never-created').exists())
