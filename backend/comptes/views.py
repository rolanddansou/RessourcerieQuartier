from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response


def donnees_utilisateur(user):
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
    }


@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    user = authenticate(
        username=request.data.get("username"),
        password=request.data.get("password"),
    )
    if user is None:
        return Response(
            {"detail": "Identifiant ou mot de passe incorrect."}, status=400
        )
    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key, "user": donnees_utilisateur(user)})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout(request):
    request.user.auth_token.delete()
    return Response(status=204)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    return Response(donnees_utilisateur(request.user))