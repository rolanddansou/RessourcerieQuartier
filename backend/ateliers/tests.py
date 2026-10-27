from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from .models import Atelier


class AteliersApiTests(TestCase):
    def test_public_list_contains_active_workshops_in_date_order(self):
        demain = timezone.now() + timedelta(days=1)
        apres_demain = timezone.now() + timedelta(days=2)
        plus_tard = Atelier.objects.create(
            nom="Atelier tardif",
            date=apres_demain,
            lieu="Salle B",
            places_disponible=8,
        )
        plus_tot = Atelier.objects.create(
            nom="Atelier proche",
            date=demain,
            lieu="Salle A",
            places_disponible=5,
        )

        response = self.client.get("/api/ateliers/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [atelier["id"] for atelier in response.json()],
            [plus_tot.id, plus_tard.id],
        )

    def test_cancelled_workshops_are_hidden_from_public_list(self):
        Atelier.objects.create(
            nom="Atelier annulé",
            date=timezone.now() + timedelta(days=1),
            lieu="Salle A",
            places_disponible=5,
            annule=True,
        )

        response = self.client.get("/api/ateliers/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

# Create your tests here.
