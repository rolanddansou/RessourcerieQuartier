from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.contrib.auth.views import redirect_to_login
from django.urls import reverse
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_safe


def health(request):
    return JsonResponse({"status": "ok", "service": "ressourcerie-quartier"})


@never_cache
@require_safe
def serve_frontend(request, required_role=None):
    """Serve the Vite app; static assets are handled by WhiteNoise."""
    if required_role:
        from .auth import planning_identity

        if not request.user.is_authenticated:
            return redirect_to_login(request.get_full_path(), reverse('login-app'))
        identity = planning_identity(request)
        if not identity or required_role not in identity.roles:
            return HttpResponse('Vous ne disposez pas des droits nécessaires pour accéder à cet espace.', status=403)
    try:
        html = (settings.FRONTEND_DIST / 'index.html').read_text(encoding='utf-8')
    except FileNotFoundError:
        return HttpResponse(
            'Le frontend doit être compilé. Depuis le dossier frontend, '
            'exécutez « npm.cmd run build », puis redémarrez Django.',
            content_type='text/plain; charset=utf-8', status=503,
        )
    return HttpResponse(html, content_type='text/html; charset=utf-8')


@never_cache
@require_safe
def login_app(request):
    return serve_frontend(request)


@never_cache
@require_safe
def planning_app(request):
    """The shared planning app is available to admins and volunteers."""
    from .auth import planning_identity

    if not request.user.is_authenticated:
        return redirect_to_login(request.get_full_path(), reverse('login-app'))
    if not planning_identity(request):
        return HttpResponse('Vous ne disposez pas des droits nécessaires pour accéder au planning.', status=403)
    return serve_frontend(request)


@never_cache
@require_safe
def management_app(request):
    return serve_frontend(request, required_role='admin')
