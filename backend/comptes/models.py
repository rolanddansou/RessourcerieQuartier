# backend/comptes/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models

class Utilisateur(AbstractUser):
    class Role(models.TextChoices):
        BENEVOLE = "benevole", "Bénévole"
        ADMIN = "admin", "Administrateur"

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.BENEVOLE)