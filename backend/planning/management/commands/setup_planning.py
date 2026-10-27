from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Crée le groupe benevole sans modifier les comptes existants.'

    def handle(self, *args, **options):
        Group.objects.get_or_create(name='benevole')
        self.stdout.write(self.style.SUCCESS('Groupe benevole prêt.'))
