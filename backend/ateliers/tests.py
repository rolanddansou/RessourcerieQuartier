from datetime import timedelta
from unittest.mock import patch

from django.core import mail
from django.test import TestCase, override_settings
from django.utils import timezone

from .models import Atelier, Inscription


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
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
        self.assertEqual(response.json()[0]["places_disponible"], 5)

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

    @patch("ateliers.views.send_mail", return_value=1)
    def test_public_can_register_and_receives_unique_unsubscribe_link(self, send_mail):
        atelier = Atelier.objects.create(
            nom="Réparation vélo",
            date=timezone.now() + timedelta(days=1),
            lieu="Salle A",
            places_disponible=2,
        )

        response = self.client.post(
            f"/api/ateliers/{atelier.id}/inscriptions/",
            {"nom": "Camille", "email": "camille@example.com"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        inscription = Inscription.objects.get()
        self.assertEqual(inscription.email, "camille@example.com")
        self.assertEqual(atelier.__class__.objects.get(pk=atelier.pk).places_reservees, 1)
        self.assertIn(str(inscription.token), send_mail.call_args.kwargs["message"])

    def test_registration_rejects_full_workshop(self):
        atelier = Atelier.objects.create(
            nom="Complet",
            date=timezone.now() + timedelta(days=1),
            lieu="Salle A",
            places_disponible=1,
            places_reservees=1,
        )

        response = self.client.post(
            f"/api/ateliers/{atelier.id}/inscriptions/",
            {"nom": "Camille", "email": "camille@example.com"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 409)
        self.assertEqual(Inscription.objects.count(), 0)

    @patch("ateliers.views.send_mail", return_value=1)
    def test_duplicate_active_registration_is_rejected(self, send_mail):
        atelier = Atelier.objects.create(
            nom="Réparation vélo",
            date=timezone.now() + timedelta(days=1),
            lieu="Salle A",
            places_disponible=3,
        )
        url = f"/api/ateliers/{atelier.id}/inscriptions/"
        donnees = {"nom": "Camille", "email": "camille@example.com"}

        self.assertEqual(
            self.client.post(url, donnees, content_type="application/json").status_code,
            201,
        )
        response = self.client.post(url, donnees, content_type="application/json")

        self.assertEqual(response.status_code, 409)
        self.assertEqual(Inscription.objects.count(), 1)
        self.assertEqual(Atelier.objects.get(pk=atelier.pk).places_reservees, 1)

    def test_unsubscribe_link_requires_confirmation_and_releases_place(self):
        atelier = Atelier.objects.create(
            nom="Réparation vélo",
            date=timezone.now() + timedelta(days=1),
            lieu="Salle A",
            places_disponible=2,
            places_reservees=1,
        )
        inscription = Inscription.objects.create(
            atelier=atelier,
            nom="Camille",
            email="camille@example.com",
        )
        url = f"/api/ateliers/desinscription/{inscription.token}/"

        preview = self.client.get(url)
        self.assertEqual(preview.status_code, 200)
        self.assertTrue(preview.json()["active"])
        self.assertTrue(Inscription.objects.get(pk=inscription.pk).active)

        response = self.client.post(url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json()["message"],
            "Votre désinscription est confirmée.",
        )
        self.assertFalse(Inscription.objects.get(pk=inscription.pk).active)
        self.assertEqual(Atelier.objects.get(pk=atelier.pk).places_reservees, 0)

        self.client.post(url)
        self.assertEqual(Atelier.objects.get(pk=atelier.pk).places_reservees, 0)

    def test_registration_sends_email_with_unsubscribe_link(self):
        atelier = Atelier.objects.create(
            nom="Réparation vélo",
            date=timezone.now() + timedelta(days=1),
            lieu="Salle A",
            places_disponible=2,
        )

        response = self.client.post(
            f"/api/ateliers/{atelier.id}/inscriptions/",
            {"nom": "Camille", "email": "camille@example.com"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn(str(Inscription.objects.get().token), mail.outbox[0].body)

    def test_invalid_unsubscribe_token_returns_not_found(self):
        response = self.client.get(
            "/api/ateliers/desinscription/00000000-0000-0000-0000-000000000000/"
        )

        self.assertEqual(response.status_code, 404)
