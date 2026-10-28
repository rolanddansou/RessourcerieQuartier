from datetime import timedelta

from django.core.exceptions import ValidationError
from django.db import transaction

from .models import Assignment, Availability, PlanningWriteLock, WeeklyPlanning


def lock_writes():
    # Called inside atomic() before any scheduling reads. The UPDATE obtains a
    # write lock on SQLite and a row lock on PostgreSQL, even for empty weeks.
    PlanningWriteLock.objects.get_or_create(pk=1)
    PlanningWriteLock.objects.filter(pk=1).update(held=True)


def validate_slot(data):
    if data['start'] >= data['end']:
        raise ValidationError({'end': 'La fin doit être après le début, le même jour.'})


@transaction.atomic
def save_availability(user_ref, data, pk=None):
    lock_writes()
    item = Availability.objects.select_for_update().get(pk=pk, user_ref=user_ref) if pk else Availability(user_ref=user_ref)
    validate_slot(data)
    conflict = Availability.objects.filter(
        user_ref=user_ref,
        date=data['date'],
        start__lt=data['end'],
        end__gt=data['start'],
    ).exclude(pk=item.pk).order_by('start').first()
    if conflict:
        raise ValidationError({
            'start': (
                'Cette plage chevauche votre disponibilité existante de '
                f'{conflict.start:%H:%M} à {conflict.end:%H:%M}. '
                'Modifiez cette plage ou choisissez des horaires qui ne se chevauchent pas.'
            )
        })
    if item.pk:
        for assignment in item.assignments.select_for_update():
            if assignment.date != data['date'] or assignment.start < data['start'] or assignment.end > data['end']:
                raise ValidationError({'availability': 'Une affectation utilise cette disponibilité. Contactez un administrateur.'})
    for key, value in data.items():
        setattr(item, key, value)
    item.full_clean()
    item.save()
    return item


@transaction.atomic
def delete_availability(user_ref, pk):
    lock_writes()
    item = Availability.objects.select_for_update().get(pk=pk, user_ref=user_ref)
    if item.assignments.exists():
        raise ValidationError({'availability': 'Une affectation utilise cette disponibilité.'})
    item.delete()


@transaction.atomic
def save_assignment(planning_id, data, volunteers, pk=None):
    lock_writes()
    planning = WeeklyPlanning.objects.select_for_update().get(pk=planning_id)
    item = Assignment.objects.select_for_update().get(pk=pk, planning=planning) if pk else Assignment(planning=planning)
    validate_slot(data)
    if data['user_ref'] not in {user.id for user in volunteers if user.active}:
        raise ValidationError({'user_ref': 'Choisissez un bénévole actif.'})
    if not planning.week <= data['date'] <= planning.week + timedelta(days=6):
        raise ValidationError({'date': 'La date doit appartenir à la semaine du planning.'})
    availability = Availability.objects.select_for_update().filter(user_ref=data['user_ref'], date=data['date'], start__lte=data['start'], end__gte=data['end']).first()
    if availability is None:
        raise ValidationError({'availability': 'La plage doit être entièrement couverte par une disponibilité.'})
    if Assignment.objects.filter(user_ref=data['user_ref'], date=data['date'], start__lt=data['end'], end__gt=data['start']).exclude(pk=item.pk).exists():
        raise ValidationError({'start': 'Ce bénévole est déjà affecté sur cette plage.'})
    item.availability = availability
    for key, value in data.items():
        setattr(item, key, value)
    item.full_clean()
    item.save()
    return item
