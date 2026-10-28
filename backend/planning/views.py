import json
from copy import copy
from dataclasses import asdict
from datetime import timedelta
from functools import wraps

from django.contrib.auth import authenticate, login, logout
from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.db import IntegrityError, OperationalError, transaction
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.csrf import csrf_protect

from . import services
from .forms import AssignmentForm, AvailabilityForm, WeekForm
from .models import Assignment, Availability, WeeklyPlanning
from .users import directory


def payload(request):
    try:
        value = json.loads(request.body or '{}')
        if not isinstance(value, dict):
            raise ValueError()
        return value
    except (ValueError, UnicodeDecodeError):
        raise ValidationError({'body': 'Objet JSON invalide.'})


def cleaned(form_class, data):
    form = form_class(data)
    if not form.is_valid():
        raise ValidationError(dict(form.errors))
    return form.cleaned_data


def endpoint(methods, role=None, public=False):
    def decorator(view):
        @csrf_protect
        @wraps(view)
        def wrapped(request, *args, **kwargs):
            if request.method not in methods:
                return JsonResponse({'errors': {'method': ['Méthode non autorisée.']}}, status=405)
            request.directory = directory()
            request.identity = request.directory.current(request)
            if not public:
                if not request.identity or not request.identity.active:
                    return JsonResponse({'errors': {'auth': ['Connexion requise.']}}, status=401)
                if not set(request.identity.roles) & {'admin', 'benevole'} or (role and role not in request.identity.roles):
                    return JsonResponse({'errors': {'permission': ['Accès refusé.']}}, status=403)
            try:
                return view(request, *args, **kwargs)
            except ValidationError as error:
                return JsonResponse({'errors': error.message_dict if hasattr(error, 'message_dict') else {'form': error.messages}}, status=400)
            except ObjectDoesNotExist:
                return JsonResponse({'errors': {'resource': ['Élément introuvable.']}}, status=404)
            except IntegrityError:
                return JsonResponse({'errors': {'conflict': ['Conflit : rechargez la semaine puis réessayez.']}}, status=409)
            except OperationalError as error:
                if 'locked' not in str(error).lower() and 'deadlock' not in str(error).lower():
                    raise
                return JsonResponse({'errors': {'conflict': ['Une autre modification est en cours. Réessayez.']}}, status=409)
        return wrapped
    return decorator


def slot(item):
    result = {'id': item.pk, 'user_ref': item.user_ref, 'date': item.date.isoformat(), 'start': item.start.strftime('%H:%M'), 'end': item.end.strftime('%H:%M')}
    result['note' if isinstance(item, Assignment) else 'details'] = item.note if isinstance(item, Assignment) else item.details
    return result


def planning_json(item, directory):
    names = {user.id: user.name for user in directory.volunteers()}
    return {'id': item.pk, 'week': item.week.isoformat(), 'published': item.published, 'assignments': [{**slot(entry), 'name': names.get(entry.user_ref, 'Bénévole indisponible')} for entry in item.assignments.all()]}


@endpoint(['GET'], public=True)
def session(request):
    return JsonResponse({'user': asdict(request.identity) if request.identity else None, 'csrf': get_token(request)})


@endpoint(['POST'], public=True)
def sign_in(request):
    data = payload(request)
    if not isinstance(data.get('username'), str) or not isinstance(data.get('password'), str):
        raise ValidationError({'auth': 'Identifiant et mot de passe requis.'})
    user = authenticate(request, username=data['username'], password=data['password'])
    if user is None:
        raise ValidationError({'auth': 'Identifiants invalides.'})
    probe = copy(request)
    probe.user = user
    identity = request.directory.current(probe)
    if not identity or not identity.active or not set(identity.roles) & {'admin', 'benevole'}:
        raise ValidationError({'auth': 'Ce compte ne possède pas d’accès à cet espace.'})
    login(request, user)
    return JsonResponse({'user': asdict(identity), 'csrf': get_token(request)})


@endpoint(['POST'])
def sign_out(request):
    logout(request)
    return JsonResponse({'ok': True})


@endpoint(['GET', 'POST'], role='benevole')
def availabilities(request):
    if request.method == 'POST':
        item = services.save_availability(request.identity.id, cleaned(AvailabilityForm, payload(request)))
        return JsonResponse(slot(item), status=201)
    week = cleaned(WeekForm, request.GET)['week']
    return JsonResponse({'items': [slot(item) for item in Availability.objects.filter(user_ref=request.identity.id, date__range=(week, week + timedelta(days=6)))]})


@endpoint(['PUT', 'DELETE'], role='benevole')
def availability_detail(request, pk):
    if request.method == 'DELETE':
        services.delete_availability(request.identity.id, pk)
        return JsonResponse({'ok': True})
    return JsonResponse(slot(services.save_availability(request.identity.id, cleaned(AvailabilityForm, payload(request)), pk)))


@endpoint(['GET'], role='admin')
def volunteers(request):
    return JsonResponse({'items': [asdict(user) for user in request.directory.volunteers() if user.active]})


@endpoint(['GET'], role='admin')
def team_availabilities(request):
    week = cleaned(WeekForm, request.GET)['week']
    return JsonResponse({'items': [slot(item) for item in Availability.objects.filter(date__range=(week, week + timedelta(days=6)))]})


@endpoint(['GET', 'POST'])
def weeks(request):
    if request.method == 'POST':
        if 'admin' not in request.identity.roles:
            return JsonResponse({'errors': {'permission': ['Accès refusé.']}}, status=403)
        week = cleaned(WeekForm, payload(request))['week']
        with transaction.atomic():
            services.lock_writes()
            item, created = WeeklyPlanning.objects.get_or_create(week=week)
        return JsonResponse(planning_json(item, request.directory), status=201 if created else 200)
    week = cleaned(WeekForm, request.GET)['week']
    items = WeeklyPlanning.objects.filter(week=week)
    if 'admin' not in request.identity.roles:
        items = items.filter(published=True)
    return JsonResponse({'items': [planning_json(item, request.directory) for item in items]})


@endpoint(['POST'], role='admin')
def publication(request, pk):
    data = payload(request)
    if type(data.get('published')) is not bool:
        raise ValidationError({'published': 'Un booléen est requis.'})
    with transaction.atomic():
        services.lock_writes()
        item = WeeklyPlanning.objects.select_for_update().get(pk=pk)
        item.published = data['published']
        item.save(update_fields=['published'])
    return JsonResponse(planning_json(item, request.directory))


@endpoint(['POST'], role='admin')
def assignments(request, pk):
    return JsonResponse(slot(services.save_assignment(pk, cleaned(AssignmentForm, payload(request)), request.directory.volunteers())), status=201)


@endpoint(['PUT', 'DELETE'], role='admin')
def assignment_detail(request, pk, assignment_id):
    if request.method == 'DELETE':
        with transaction.atomic():
            services.lock_writes()
            WeeklyPlanning.objects.select_for_update().get(pk=pk)
            Assignment.objects.get(pk=assignment_id, planning_id=pk).delete()
        return JsonResponse({'ok': True})
    return JsonResponse(slot(services.save_assignment(pk, cleaned(AssignmentForm, payload(request)), request.directory.volunteers(), assignment_id)))
