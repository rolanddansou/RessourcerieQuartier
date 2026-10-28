from copy import copy
from urllib.parse import urlsplit

from django.contrib import admin
from django.contrib.auth.forms import AuthenticationForm
from django.contrib.auth.views import LoginView
from django.core.exceptions import ValidationError
from django.urls import reverse

from planning.users import directory


def planning_identity(request, user=None):
    probe = copy(request)
    if user is not None:
        probe.user = user
    identity = directory().current(probe)
    return identity if identity and identity.active and set(identity.roles) & {'admin', 'benevole'} else None


class SharedAuthenticationForm(AuthenticationForm):
    def confirm_login_allowed(self, user):
        super().confirm_login_allowed(user)
        if not user.is_staff and not planning_identity(self.request, user):
            raise ValidationError('Ce compte ne possède pas d’accès à cet espace.', code='access_denied')


class SharedLoginView(LoginView):
    template_name = 'admin/login.html'
    authentication_form = SharedAuthenticationForm
    redirect_authenticated_user = True

    def get_success_url(self):
        target = self.get_redirect_url()  # Django validates the destination host.
        planning_url = reverse('planning-app')
        identity = planning_identity(self.request)
        if identity and 'admin' in identity.roles:
            return reverse('management-app')
        if not self.request.user.is_staff:
            # Volunteers cannot follow a next URL into model administration.
            return target if target and urlsplit(target).path == planning_url else planning_url
        if target and urlsplit(target).path not in {reverse('admin:login'), reverse('admin:logout')}:
            return target
        return reverse('admin:index')

    def get_context_data(self, **kwargs):
        self.request.current_app = admin.site.name
        return {
            **admin.site.each_context(self.request),
            **super().get_context_data(**kwargs),
            'title': 'Connexion',
            'subtitle': None,
            'app_path': self.request.get_full_path(),
            'session_expired': self.request.GET.get('expired') == '1',
        }
