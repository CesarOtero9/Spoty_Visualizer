from __future__ import annotations

import os
import base64
from urllib.parse import urlencode
import requests
from dotenv import load_dotenv

load_dotenv()

SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")
SPOTIFY_REDIRECT_URI = os.getenv(
    "SPOTIFY_REDIRECT_URI",
    "http://127.0.0.1:8080/callback"
)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://127.0.0.1:3000")

SPOTIFY_SCOPES = " ".join([
    "user-read-currently-playing",
    "user-read-playback-state",
    "user-top-read",
    "user-read-recently-played",
    "user-library-read",
    "user-read-email",          # ← Para obtener email
    "user-read-private",        # ← Para obtener perfil privado
])


class SpotifyAuthError(Exception):
    pass


def _get_basic_auth_header() -> str:
    if not SPOTIFY_CLIENT_ID or not SPOTIFY_CLIENT_SECRET:
        raise SpotifyAuthError(
            "Faltan SPOTIFY_CLIENT_ID o SPOTIFY_CLIENT_SECRET en .env"
        )

    auth_string = f"{SPOTIFY_CLIENT_ID}:{SPOTIFY_CLIENT_SECRET}"
    auth_base64 = base64.b64encode(auth_string.encode()).decode()
    return f"Basic {auth_base64}"


def get_auth_url(show_dialog=False, state=None):
    """Genera la URL de autorización de Spotify"""
    auth_base_url = "https://accounts.spotify.com/authorize"

    params = {
        'client_id': SPOTIFY_CLIENT_ID,
        'response_type': 'code',
        'redirect_uri': SPOTIFY_REDIRECT_URI,
        'scope': SPOTIFY_SCOPES,
    }

    if show_dialog:
        params['show_dialog'] = 'true'
    if state:
        params['state'] = state

    auth_url = f"{auth_base_url}?{urlencode(params)}"
    print(f"[DEBUG] ✅ Auth URL generada")
    return auth_url


def exchange_code_for_tokens(auth_code: str) -> dict | None:
    """Intercambia el código de autorización por tokens"""
    try:
        token_url = "https://accounts.spotify.com/api/token"

        headers = {
            "Authorization": _get_basic_auth_header(),
            "Content-Type": "application/x-www-form-urlencoded",
        }

        data = {
            "grant_type": "authorization_code",
            "code": auth_code,
            "redirect_uri": SPOTIFY_REDIRECT_URI,
        }

        response = requests.post(token_url, headers=headers, data=data, timeout=10)
        response.raise_for_status()

        tokens = response.json()
        print(f"[DEBUG] ✅ Tokens obtenidos")
        return tokens

    except Exception as e:
        print(f"❌ Error en exchange_code_for_tokens: {e}")
        if hasattr(e, 'response') and e.response:
            print(f"❌ Response: {e.response.text}")
        return None


def refresh_access_token(refresh_token: str) -> dict | None:
    """Usa el refresh_token para pedir un nuevo access_token"""
    try:
        headers = {
            "Authorization": _get_basic_auth_header(),
            "Content-Type": "application/x-www-form-urlencoded",
        }

        data = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
        }

        response = requests.post(
            "https://accounts.spotify.com/api/token",
            headers=headers,
            data=data,
            timeout=10,
        )

        if response.status_code == 200:
            tokens = response.json()
            print("[spotify_oauth] ✅ Access token refrescado")
            return tokens

        print(f"[spotify_oauth] ❌ Error al refrescar: {response.text}")
        return None

    except Exception as e:
        print(f"[spotify_oauth] 💥 Excepción: {e}")
        return None