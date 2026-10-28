from django.utils.crypto import get_random_string
from django.contrib.auth.models import Group
from rest_framework import serializers

from .models import Utilisateur


class BenevoleSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Utilisateur
        fields = ["id", "username", "first_name", "last_name", "email", "is_active", "password"]

    def validate(self, data):
        if self.instance is None and not data.get("password"):
            raise serializers.ValidationError({"password": "Le mot de passe est obligatoire."})
        return data

    def create(self, validated_data):
        password = validated_data.pop("password", None) or get_random_string(12)
        user = Utilisateur(**validated_data, role="benevole")
        user.set_password(password)
        user.save()
        group, _ = Group.objects.get_or_create(name="benevole")
        user.groups.add(group)
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for champ, valeur in validated_data.items():
            setattr(instance, champ, valeur)
        if password:
            instance.set_password(password)
        instance.save()
        group, _ = Group.objects.get_or_create(name="benevole")
        instance.groups.add(group)
        return instance
