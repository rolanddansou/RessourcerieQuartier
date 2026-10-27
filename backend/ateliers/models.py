import uuid

from django.db import models


class Atelier(models.Model):
    nom = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    date = models.DateTimeField()
    lieu = models.CharField(max_length=200)
    places_disponible = models.PositiveIntegerField(default=0)
    places_reservees = models.PositiveIntegerField(default=0)
    annule = models.BooleanField(default=False)

    def __str__(self):
        return self.nom


class Inscription(models.Model):
    atelier = models.ForeignKey(
        Atelier,
        on_delete=models.CASCADE,
        related_name="inscriptions",
    )
    nom = models.CharField(max_length=200)
    email = models.EmailField()
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    active = models.BooleanField(default=True)
    creee_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("atelier", "email"),
                condition=models.Q(active=True),
                name="unique_active_atelier_email",
            ),
        ]

    def __str__(self):
        return f"{self.nom} - {self.atelier.nom}"