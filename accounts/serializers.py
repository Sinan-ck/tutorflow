from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User


class RoleTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Standard JWT login, but also returns the role/username directly so the
    frontend can route immediately without a second request. The role
    embedded in the token is informational only for the client -- every
    permission check server-side re-reads request.user.role from the DB.
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["username"] = user.username
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["role"] = self.user.role
        data["username"] = self.user.username
        data["user_id"] = self.user.id
        return data


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "role"]
