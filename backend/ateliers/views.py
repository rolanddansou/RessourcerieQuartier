import json
from json import JSONDecodeError
from urllib.parse import urljoin

from django.conf import settings
from django.core.mail import send_mail
from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.core.validators import validate_email
from django.db import IntegrityError, transaction
from django.db.models import F
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .models import Atelier, Inscription


def liste_ateliers(request):
    ateliers = Atelier.objects.filter(annule=False).order_by("date")
    return JsonResponse(
        [
            {
                "id": atelier.id,
                "nom": atelier.nom,
                "description": atelier.description,
                "date": atelier.date.isoformat(),
                "lieu": atelier.lieu,
                "places_disponible": max(
                    0, atelier.places_disponible - atelier.places_reservees
                ),
            }
            for atelier in ateliers
        ],
        safe=False,
    )


@csrf_exempt
@require_http_methods(["POST"])
def inscrire(request, atelier_id):
    try:
        donnees = json.loads(request.body)
    except (JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"error": "Le formulaire est invalide."}, status=400)

    if not isinstance(donnees, dict):
        return JsonResponse({"error": "Le formulaire est invalide."}, status=400)

    nom = donnees.get("nom")
    email = donnees.get("email")
    if not isinstance(nom, str) or not nom.strip() or len(nom.strip()) > 200:
        return JsonResponse({"error": "Saisissez un nom valide."}, status=400)
    if not isinstance(email, str):
        return JsonResponse({"error": "Saisissez une adresse courriel valide."}, status=400)

    email = email.strip().lower()
    try:
        validate_email(email)
    except ValidationError:
        return JsonResponse({"error": "Saisissez une adresse courriel valide."}, status=400)

    try:
        atelier_initial = Atelier.objects.get(pk=atelier_id)
    except Atelier.DoesNotExist:
        return JsonResponse({"error": "Cet atelier n’existe pas."}, status=404)
    if atelier_initial.annule:
        return JsonResponse({"error": "Cet atelier a été annulé."}, status=409)

    try:
        with transaction.atomic():
            place_reservee = Atelier.objects.filter(
                pk=atelier_id,
                annule=False,
                places_reservees__lt=F("places_disponible"),
            ).update(places_reservees=F("places_reservees") + 1)
            if not place_reservee:
                return JsonResponse(
                    {"error": "Il n’y a plus de place disponible."},
                    status=409,
                )

            inscription = Inscription.objects.create(
                atelier_id=atelier_id,
                nom=nom.strip(),
                email=email,
            )
            lien = urljoin(
                f"{settings.FRONTEND_URL.rstrip('/')}/",
                f"desinscription/{inscription.token}",
            )
            atelier = inscription.atelier
            date = atelier.date.strftime("%d/%m/%Y à %H:%M")
            send_mail(
                subject=f"Inscription confirmée : {atelier.nom}",
                message=(
                    f"Bonjour {inscription.nom},\n\n"
                    f"Votre inscription à l’atelier « {atelier.nom} » "
                    f"du {date} est confirmée.\n"
                    f"Pour annuler votre venue, utilisez ce lien :\n{lien}\n"
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
            )
    except IntegrityError:
        return JsonResponse(
            {"error": "Cette adresse est déjà inscrite à cet atelier."},
            status=409,
        )

    return JsonResponse(
        {
            "message": "Votre inscription est confirmée.",
            "email": email,
        },
        status=201,
    )


@csrf_exempt
@require_http_methods(["GET", "POST"])
def desinscrire(request, token):
    try:
        inscription = Inscription.objects.select_related("atelier").get(token=token)
    except Inscription.DoesNotExist:
        return JsonResponse({"error": "Ce lien de désinscription est invalide."}, status=404)

    if request.method == "GET":
        return JsonResponse(
            {
                "atelier": inscription.atelier.nom,
                "date": inscription.atelier.date.isoformat(),
                "active": inscription.active,
            }
        )

    with transaction.atomic():
        inscription = Inscription.objects.select_for_update().get(pk=inscription.pk)
        if inscription.active:
            inscription.active = False
            inscription.save(update_fields=("active",))
            Atelier.objects.filter(
                pk=inscription.atelier_id,
                places_reservees__gt=0,
            ).update(places_reservees=F("places_reservees") - 1)

    return JsonResponse({"message": "Votre désinscription est confirmée."})
