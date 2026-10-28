from django.db import models
from django.db.models import F, Q


class PlanningWriteLock(models.Model):
    """Single database mutex for cross-model scheduling invariants."""
    held = models.BooleanField(default=True)


class Availability(models.Model):
    user_ref = models.CharField(max_length=255, db_index=True)
    date = models.DateField()
    start = models.TimeField()
    end = models.TimeField()
    details = models.CharField(max_length=2000, blank=True)

    class Meta:
        ordering = ['date', 'start', 'pk']
        constraints = [models.CheckConstraint(condition=Q(start__lt=F('end')), name='availability_positive_duration')]


class WeeklyPlanning(models.Model):
    week = models.DateField(unique=True)
    published = models.BooleanField(default=False)

    class Meta:
        ordering = ['week']


class Assignment(models.Model):
    planning = models.ForeignKey(WeeklyPlanning, on_delete=models.CASCADE, related_name='assignments')
    availability = models.ForeignKey(Availability, on_delete=models.PROTECT, related_name='assignments')
    user_ref = models.CharField(max_length=255, db_index=True)
    date = models.DateField()
    start = models.TimeField()
    end = models.TimeField()
    note = models.CharField(max_length=2000, blank=True)

    class Meta:
        ordering = ['date', 'start', 'pk']
        constraints = [models.CheckConstraint(condition=Q(start__lt=F('end')), name='assignment_positive_duration')]
