# backend/services/spotify_service.py

"""
Servicio de alto nivel para consumir la Web API de Spotify.
Se apoya en auth/spotify_oauth.py para OAuth, y aquí se concentran
todas las funciones de negocio: usuario, top tracks, artistas, etc.
"""

from __future__ import annotations

import requests

from auth.spotify_oauth import (
    get_auth_url,
    exchange_code_for_tokens,
    refresh_access_token,
)


class SpotifyService:
    BASE_URL = "https://api.spotify.com/v1"

    # ========== Métodos relacionados con OAuth (simple pass-through) ==========

    @staticmethod
    def get_auth_url(show_dialog: bool = True, state: str | None = None) -> str:
        """
        Devuelve la URL de autenticación.
        """
        return get_auth_url(show_dialog=show_dialog, state=state)

    @staticmethod
    def exchange_code_for_tokens(auth_code: str) -> dict | None:
        """
        Intercambia el código de autorización por tokens.
        """
        return exchange_code_for_tokens(auth_code)

    @staticmethod
    def refresh_access_token(refresh_token: str) -> dict | None:
        """
        Refresca el access_token usando el refresh_token.
        """
        return refresh_access_token(refresh_token)

    # ========================= Métodos de la Web API ==========================

    @staticmethod
    def _auth_header(access_token: str) -> dict:
        return {"Authorization": f"Bearer {access_token}"}

    def get_user_profile(self, access_token: str) -> dict | None:
        try:
            response = requests.get(
                f"{self.BASE_URL}/me",
                headers=self._auth_header(access_token),
                timeout=5
            )
            if response.status_code == 200:
                return response.json()

            print(f"[spotify_service] Error get_user_profile: {response.status_code} {response.text}")
            return None
        except Exception as e:
            print(f"[spotify_service] Excepción get_user_profile: {e}")
            return None

    def get_top_tracks(
        self,
        access_token: str,
        time_range: str = "short_term",
        limit: int = 10
    ) -> dict | None:
        try:
            response = requests.get(
                f"{self.BASE_URL}/me/top/tracks",
                headers=self._auth_header(access_token),
                params={"time_range": time_range, "limit": limit},
                timeout=5
            )
            if response.status_code == 200:
                return response.json()

            print(f"[spotify_service] Error get_top_tracks: {response.status_code} {response.text}")
            return None
        except Exception as e:
            print(f"[spotify_service] Excepción get_top_tracks: {e}")
            return None

    def get_top_artists(
        self,
        access_token: str,
        time_range: str = "short_term",
        limit: int = 10
    ) -> dict | None:
        try:
            response = requests.get(
                f"{self.BASE_URL}/me/top/artists",
                headers=self._auth_header(access_token),
                params={"time_range": time_range, "limit": limit},
                timeout=5
            )
            if response.status_code == 200:
                return response.json()

            print(f"[spotify_service] Error get_top_artists: {response.status_code} {response.text}")
            return None
        except Exception as e:
            print(f"[spotify_service] Excepción get_top_artists: {e}")
            return None

    def get_recent_tracks(self, access_token: str, limit: int = 20) -> dict | None:
        try:
            response = requests.get(
                f"{self.BASE_URL}/me/player/recently-played",
                headers=self._auth_header(access_token),
                params={"limit": limit},
                timeout=5
            )
            if response.status_code == 200:
                return response.json()

            print(f"[spotify_service] Error get_recent_tracks: {response.status_code} {response.text}")
            return None
        except Exception as e:
            print(f"[spotify_service] Excepción get_recent_tracks: {e}")
            return None

    def get_current_track_with_features(self, access_token: str) -> dict | None:
        """
        Devuelve la canción actual y, si es posible, las audio features
        (energy, tempo, danceability, etc.) listas para tu visualizador.
        """
        try:
            headers = self._auth_header(access_token)

            # Canción actual
            response = requests.get(
                f"{self.BASE_URL}/me/player/currently-playing",
                headers=headers,
                timeout=5
            )

            if response.status_code == 204:
                # No hay reproducción activa
                return {"is_playing": False, "message": "No content"}

            if response.status_code != 200:
                print(f"[spotify_service] Error current track: {response.status_code} {response.text}")
                return None

            track_data = response.json()

            # Audio features
            item = track_data.get("item")
            if item and item.get("id"):
                track_id = item["id"]
                feat_resp = requests.get(
                    f"{self.BASE_URL}/audio-features/{track_id}",
                    headers=headers,
                    timeout=5
                )
                if feat_resp.status_code == 200:
                    audio_features = feat_resp.json()
                    track_data["audio_features"] = {
                        "energy": audio_features.get("energy", 0.5),
                        "tempo": audio_features.get("tempo", 120),
                        "danceability": audio_features.get("danceability", 0.5),
                        "valence": audio_features.get("valence", 0.5),
                        "acousticness": audio_features.get("acousticness", 0.5),
                    }

            return track_data

        except Exception as e:
            print(f"[spotify_service] Excepción get_current_track_with_features: {e}")
            return None


# Instancia "global" para usar directamente en app.py si quieres
spotify_service = SpotifyService()
