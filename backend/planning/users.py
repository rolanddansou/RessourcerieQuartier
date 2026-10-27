from dataclasses import dataclass
from typing import Protocol

from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils.module_loading import import_string


@dataclass(frozen=True)
class Identity:
    id: str
    name: str
    roles: tuple[str, ...]
    active: bool


class UserDirectory(Protocol):
    def current(self, request) -> Identity | None: ...
    def volunteers(self) -> list[Identity]: ...


class DjangoUserDirectory:
    def identity(self, user):
        roles = []
        if user.is_superuser:
            roles.append('admin')
        if user.groups.filter(name='benevole').exists():
            roles.append('benevole')
        return Identity(str(user.pk), user.get_full_name() or user.get_username(), tuple(roles), user.is_active)

    def current(self, request):
        return self.identity(request.user) if request.user.is_authenticated else None

    def volunteers(self):
        return [self.identity(user) for user in get_user_model().objects.filter(groups__name='benevole').distinct()]


def directory() -> UserDirectory:
    return import_string(settings.PLANNING_USER_DIRECTORY)()
