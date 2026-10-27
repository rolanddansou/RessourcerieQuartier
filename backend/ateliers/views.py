from django.shortcuts import render

# Create your views here.
from django.http import JsonResponse

from .models import Atelier


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
                "places_disponible": atelier.places_disponible,
            }
            for atelier in ateliers
        ],
        safe=False,
    )
