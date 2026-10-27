from getpass import getpass
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction


class Command(BaseCommand):
    help = 'Crée un compte de démonstration sans remplacer un compte existant (adaptateur Django uniquement).'

    def add_arguments(self, parser):
        parser.add_argument('--username', required=True)
        parser.add_argument('--role', choices=['admin', 'benevole'], required=True)

    @transaction.atomic
    def handle(self, *args, **options):
        model = get_user_model()
        if model.objects.filter(username=options['username']).exists():
            raise CommandError('Ce compte existe déjà.')
        password = getpass('Mot de passe : ')
        if password != getpass('Confirmez le mot de passe : '):
            raise CommandError('Les mots de passe diffèrent.')
        user = model(username=options['username'], is_superuser=options['role'] == 'admin', is_staff=options['role'] == 'admin')
        try:
            validate_password(password, user)
        except ValidationError as error:
            raise CommandError('; '.join(error.messages))
        user.set_password(password)
        user.save()
        if options['role'] == 'benevole':
            group, _ = Group.objects.get_or_create(name='benevole')
            user.groups.add(group)
        self.stdout.write(self.style.SUCCESS('Compte créé.'))
