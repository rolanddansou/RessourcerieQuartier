import json
from datetime import date

from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt

from .models import InfosRessourcerie, Fermeture


# ==============================================================================
# INFORMATIONS PUBLIQUES (HORAIRES, ADRESSE, CONTACT)
# ==============================================================================

def _infos_to_dict(infos):
    horaires = []
    for line in infos.horaires.splitlines():
        if '|' in line:
            jour, plage = line.split('|', 1)
            horaires.append({"jour": jour.strip(), "plage": plage.strip()})
    return {
        "adresse": infos.adresse,
        "acces": infos.acces,
        "telephone": infos.telephone,
        "email": infos.email,
        "horaires": horaires,
        "jours_fermes": infos.jours_fermes,
        "fermetures": [
            {"id": f.id, "date": f.date.isoformat(), "motif": f.motif}
            for f in Fermeture.objects.filter(date__gte=date.today())
        ],
        "updated_at": infos.updated_at.isoformat(),
    }


@csrf_exempt
def api_infos(request):
    infos = InfosRessourcerie.get_solo()

    if request.method == 'GET':
        return JsonResponse(_infos_to_dict(infos))

    if request.method in ['PUT', 'PATCH']:
        try:
            body = json.loads(request.body.decode('utf-8'))
            for field in ('adresse', 'acces', 'telephone', 'email', 'jours_fermes'):
                if field in body:
                    setattr(infos, field, str(body[field]).strip())
            if 'horaires' in body:
                lignes = body['horaires']
                if isinstance(lignes, list):
                    lignes = "\n".join(f"{h.get('jour', '').strip()}|{h.get('plage', '').strip()}"
                                       for h in lignes if h.get('jour', '').strip())
                infos.horaires = lignes
            infos.save()
            return JsonResponse(_infos_to_dict(infos))
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def api_fermetures(request):
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)
    try:
        body = json.loads(request.body.decode('utf-8'))
        jour = date.fromisoformat(body.get('date', ''))
        f, _ = Fermeture.objects.update_or_create(date=jour, defaults={"motif": body.get('motif', '').strip()})
        InfosRessourcerie.get_solo().save()
        return JsonResponse({"status": "created", "id": f.id}, status=201)
    except ValueError:
        return JsonResponse({"error": "Date invalide"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@csrf_exempt
def api_fermeture_detail(request, pk):
    f = get_object_or_404(Fermeture, pk=pk)
    if request.method == 'DELETE':
        f.delete()
        InfosRessourcerie.get_solo().save()
        return JsonResponse({"status": "deleted"})
    return JsonResponse({"error": "Method not allowed"}, status=405)
