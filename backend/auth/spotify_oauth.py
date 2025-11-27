# backend/auth/spotify_oauth.py

"""
Módulo encargado de TODO lo relacionado con OAuth de Spotify:
- Construir la URL de login.
- Intercambiar el "code" por tokens.
- Refrescar el access_token.

Lee las credenciales desde variables de entorno (.env).
"""

import os
import base64
from urllib.parse import urlencode

import requests
from dotenv import load_dotenv

# Cargar variables de entorno desde .env
load_dotenv()

SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")
SPOTIFY_REDIRECT_URI = os.getenv("SPOTIFY_REDIRECT_URI", "http://127.0.0.1:8080/callback")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://127.0.0.1:3000")

# Scopes que usará el visualizador
SPOTIFY_SCOPES = " ".join([
    "user-read-currently-playing",
    "user-read-playback-state",
    "user-top-read",
    "user-read-recently-played",
    "user-library-read",
    "user-read-email",
    "user-read-private"
])


class SpotifyAuthError(Exception):
    """Error personalizado para problemas de autenticación OAuth."""
    pass


def _get_basic_auth_header() -> str:
    """
    Construye el header Authorization Basic <base64(client_id:client_secret)>
    para las peticiones al endpoint de tokens.
    """
    if not SPOTIFY_CLIENT_ID or not SPOTIFY_CLIENT_SECRET:
        raise SpotifyAuthError(
            "Faltan SPOTIFY_CLIENT_ID o SPOTIFY_CLIENT_SECRET en las variables de entorno."
        )

    auth_string = f"{SPOTIFY_CLIENT_ID}:{SPOTIFY_CLIENT_SECRET}"
    auth_base64 = base64.b64encode(auth_string.encode()).decode()
    return f"Basic {auth_base64}"


def get_auth_url(show_dialog: bool = True, state: str | None = None) -> str:
    """
    Genera la URL a la que debe ir el usuario para loguearse en Spotify.

    :param show_dialog: Si True, Spotify siempre muestra la pantalla de login.
    :param state: Valor opcional para proteger contra CSRF.
    """
    params = {
        "client_id": SPOTIFY_CLIENT_ID,
        "response_type": "code",
        "redirect_uri": SPOTIFY_REDIRECT_URI,
        "scope": SPOTIFY_SCOPES,
        "show_dialog": str(show_dialog).lower()
    }

    if state:
        params["state"] = state

    auth_url = f"https://accounts.spotify.com/authorize?{urlencode(params)}"
    return auth_url


def exchange_code_for_tokens(auth_code: str) -> dict | None:
    """
    Intercambia el "authorization code" por access_token + refresh_token.

    :param auth_code: Código que llega a /callback como ?code=...
    :return: Diccionario con los tokens o None si falla.
    """
    try:
        headers = {
            "Authorization": _get_basic_auth_header(),
            "Content-Type": "application/x-www-form-urlencoded"
        }

        data = {
            "grant_type": "authorization_code",
            "code": auth_code,
            "redirect_uri": SPOTIFY_REDIRECT_URI,
        }

        response = requests.post(
            "https://accounts.spotify.com/api/token",
            headers=headers,
            data=data,
            timeout=10
        )

        print(f"[spotify_oauth] Respuesta token: {response.status_code}")

        if response.status_code == 200:
            tokens = response.json()
            print("[spotify_oauth] ✅ Tokens obtenidos correctamente")
            return tokens

        print(f"[spotify_oauth] ❌ Error al obtener tokens: {response.text}")
        return None

    except Exception as e:
        print(f"[spotify_oauth] 💥 Excepción en exchange_code_for_tokens: {e}")
        return None


def refresh_access_token(refresh_token: str) -> dict | None:
    """
    Usa el refresh_token para pedir un nuevo access_token.

    :param refresh_token: Refresh token original.
    :return: Diccionario con el nuevo access_token (y datos asociados) o None.
    """
    try:
        headers = {
            "Authorization": _get_basic_auth_header(),
            "Content-Type": "application/x-www-form-urlencoded"
        }

        data = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token
        }

        response = requests.post(
            "https://accounts.spotify.com/api/token",
            headers=headers,
            data=data,
            timeout=10
        )

        print(f"[spotify_oauth] Respuesta refresh: {response.status_code}")

        if response.status_code == 200:
            tokens = response.json()
            print("[spotify_oauth] ✅ Access token refrescado correctamente")
            return tokens

        print(f"[spotify_oauth] ❌ Error al refrescar token: {response.text}")
        return None

    except Exception as e:
        print(f"[spotify_oauth] 💥 Excepción en refresh_access_token: {e}")
        return None
