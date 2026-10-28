from django.db import models


class InfosRessourcerie(models.Model):
    adresse = models.CharField(max_length=255, default="14 rue de la Solidarité, 75000 Paris", verbose_name="Adresse")
    acces = models.CharField(max_length=255, blank=True, default="Métro Ligne 9 · Vélib' en face", verbose_name="Accès / transports")
    telephone = models.CharField(max_length=30, blank=True, default="01 42 00 00 00", verbose_name="Téléphone")
    email = models.EmailField(blank=True, default="contact@ressourcerie-quartier.fr", verbose_name="Email de contact")
    horaires = models.TextField(
        default="Mercredi|14h00 – 18h30\nVendredi|14h00 – 19h00\nSamedi|10h00 – 18h00",
        verbose_name="Horaires d'ouverture (une ligne par jour : Jour|plage horaire)",
    )
    jours_fermes = models.CharField(max_length=100, blank=True, default="Dim., Lun., Mar.", verbose_name="Jours de fermeture")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Dernière mise à jour")

    class Meta:
        verbose_name = "Informations de la Ressourcerie"
        verbose_name_plural = "Informations de la Ressourcerie"

    def __str__(self):
        return "Informations de la Ressourcerie"

    @classmethod
    def get_solo(cls):
        obj = cls.objects.first()
        return obj or cls.objects.create()


class Fermeture(models.Model):
    date = models.DateField(unique=True, verbose_name="Date de fermeture exceptionnelle")
    motif = models.CharField(max_length=150, blank=True, verbose_name="Motif (ex : jour férié)")

    class Meta:
        verbose_name = "Fermeture exceptionnelle"
        verbose_name_plural = "Fermetures exceptionnelles"
        ordering = ['date']

    def __str__(self):
        return f"{self.date:%d/%m/%Y} {self.motif}".strip()


class CritereDon(models.Model):
    KIND_CHOICES = [
        ('accepte', 'Objet accepté'),
        ('refuse', 'Objet refusé'),
        ('depot', 'Condition de dépôt'),
    ]

    kind = models.CharField(max_length=10, choices=KIND_CHOICES, verbose_name="Type")
    icon = models.CharField(max_length=10, blank=True, verbose_name="Icône (emoji)")
    label = models.CharField(max_length=150, blank=True, verbose_name="Titre")
    detail = models.TextField(blank=True, verbose_name="Exemples / raison / texte")
    condition = models.CharField(max_length=200, blank=True, verbose_name="Condition (objets acceptés)")
    ordre = models.PositiveIntegerField(default=0, verbose_name="Ordre d'affichage")

    class Meta:
        verbose_name = "Critère de don"
        verbose_name_plural = "Critères de don"
        ordering = ['kind', 'ordre', 'id']

    def __str__(self):
        return f"[{self.get_kind_display()}] {self.label or self.detail[:40]}"
