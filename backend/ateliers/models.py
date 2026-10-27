from django.db import models


class Atelier(models.Model):
    nom = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    date = models.DateTimeField()
    lieu = models.CharField(max_length=200)
    places_disponible = models.PositiveIntegerField(default=0)
    annule = models.BooleanField(default=False)

    def __str__(self):
        return self.nom