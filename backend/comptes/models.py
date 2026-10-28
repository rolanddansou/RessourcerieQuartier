# backend/comptes/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models

class Utilisateur(AbstractUser):
    class Role(models.TextChoices):
        SANS_ROLE = "", "Aucun accès"
        BENEVOLE = "benevole", "Bénévole"
        ADMIN = "admin", "Administrateur"

    # New accounts must receive a role explicitly (for example through the
    # volunteer creation form). A plain Django user must not gain access by default.
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.SANS_ROLE, blank=True)
