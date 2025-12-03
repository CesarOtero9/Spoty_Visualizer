# backend/services/spotify_service.py

"""
Servicio mejorado que integra extracción avanzada de colores
"""

from __future__ import annotations
import math
from typing import Dict, Any, List
import numpy as np  # Asegurar importación numpy

import requests

# ✅ IMPORTACIONES CORRECTAS
from auth.spotify_oauth import (
    get_auth_url,
    exchange_code_for_tokens,
    refresh_access_token,
)

# Importar el nuevo extractor de colores
from utils.album_color_extractor import get_album_colors_from_url


class EnhancedSpotifyService:
    BASE_URL = "https://api.spotify.com/v1"

    def __init__(self):
        print("[SpotifyService] ✅ Servicio mejorado inicializado")

    @staticmethod
    def get_auth_url(show_dialog: bool = True, state: str | None = None) -> str:
        return get_auth_url(show_dialog=show_dialog, state=state)

    @staticmethod
    def exchange_code_for_tokens(auth_code: str) -> dict | None:
        return exchange_code_for_tokens(auth_code)

    @staticmethod
    def refresh_access_token(refresh_token: str) -> dict | None:
        return refresh_access_token(refresh_token)

    # ========================= Helpers internos ==========================
    @staticmethod
    def _auth_header(access_token: str) -> dict:
        return {"Authorization": f"Bearer {access_token}"}

    def _get(self, path: str, access_token: str, params: dict | None = None) -> requests.Response:
        headers = self._auth_header(access_token)
        url = f"{self.BASE_URL}{path}"
        return requests.get(url, headers=headers, params=params, timeout=8)

    # ========================= Conversión de tipos numpy ==========================
    def _convert_numpy_types(self, obj: Any) -> Any:
        """Convierte tipos numpy a tipos nativos de Python para JSON serializable"""
        if isinstance(obj, (np.integer, np.int32, np.int64)):
            return int(obj)
        elif isinstance(obj, (np.floating, np.float32, np.float64)):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, np.bool_):
            return bool(obj)
        elif isinstance(obj, dict):
            return {k: self._convert_numpy_types(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._convert_numpy_types(item) for item in obj]
        elif isinstance(obj, tuple):
            return tuple(self._convert_numpy_types(item) for item in obj)
        else:
            return obj

    # ========================= Métodos de la Web API ==========================
    def get_user_profile(self, access_token: str) -> dict | None:
        try:
            response = self._get("/me", access_token)
            if response.status_code == 200:
                return response.json()
            print(f"[SpotifyService] Error get_user_profile: {response.status_code}")
            return None
        except Exception as e:
            print(f"[SpotifyService] Excepción get_user_profile: {e}")
            return None

    def get_top_tracks(self, access_token: str, time_range: str = "short_term", limit: int = 10) -> dict | None:
        try:
            response = self._get("/me/top/tracks", access_token,
                                 params={"time_range": time_range, "limit": limit})
            if response.status_code == 200:
                return response.json()
            print(f"[SpotifyService] Error get_top_tracks: {response.status_code}")
            return None
        except Exception as e:
            print(f"[SpotifyService] Excepción get_top_tracks: {e}")
            return None

    def get_top_artists(self, access_token: str, time_range: str = "short_term", limit: int = 10) -> dict | None:
        try:
            response = self._get("/me/top/artists", access_token,
                                 params={"time_range": time_range, "limit": limit})
            if response.status_code == 200:
                return response.json()
            print(f"[SpotifyService] Error get_top_artists: {response.status_code}")
            return None
        except Exception as e:
            print(f"[SpotifyService] Excepción get_top_artists: {e}")
            return None

    def get_recent_tracks(self, access_token: str, limit: int = 20) -> dict | None:
        try:
            response = self._get("/me/player/recently-played", access_token,
                                 params={"limit": limit})
            if response.status_code == 200:
                return response.json()
            print(f"[SpotifyService] Error get_recent_tracks: {response.status_code}")
            return None
        except Exception as e:
            print(f"[SpotifyService] Excepción get_recent_tracks: {e}")
            return None

    # ================== VERSIÓN MEJORADA PARA VISUALIZADOR ==================
    def get_current_track_enhanced(self, access_token: str) -> Dict[str, Any] | None:
        """
        Devuelve la canción actual con:
        - Datos de track completos
        - Audio features avanzadas
        - Análisis de audio
        - COLORES EXTRAÍDOS DEL ÁLBUM
        - Datos para visualización mejorada
        """
        try:
            print(f"[SpotifyService] 🎵 Obteniendo canción mejorada...")

            # 1. Canción actual
            current_resp = self._get("/me/player/currently-playing", access_token)

            if current_resp.status_code == 204:
                print("[SpotifyService] ⏸️ No hay reproducción activa")
                idle_data = self._get_idle_visualizer_data()
                return {
                    "is_playing": False,
                    "message": "No content",
                    "visualizer": self._convert_numpy_types(idle_data)
                }

            if current_resp.status_code != 200:
                print(f"[SpotifyService] ❌ Error: {current_resp.status_code}")
                return None

            raw_data = current_resp.json()
            item = raw_data.get("item")
            if not item:
                print("[SpotifyService] ❌ No hay item en la respuesta")
                return {"is_playing": False, "message": "No track item"}

            track_id = item.get("id")
            if not track_id:
                print("[SpotifyService] ❌ No hay track ID")
                return {"is_playing": False, "message": "No track id"}

            print(f"[SpotifyService] ✅ Track: {item.get('name')}")

            # 2. Audio features
            features_resp = self._get(f"/audio-features/{track_id}", access_token)
            audio_features = features_resp.json() if features_resp.status_code == 200 else {}

            # 3. Audio analysis (para beats, secciones, etc.)
            analysis_resp = self._get(f"/audio-analysis/{track_id}", access_token)
            audio_analysis = analysis_resp.json() if analysis_resp.status_code == 200 else {}

            # 4. ✨ EXTRAER COLORES DEL ÁLBUM (MEJORA PRINCIPAL)
            album_colors = self._extract_album_colors(item)

            # 5. Información de artistas (géneros, popularidad)
            artist_data = self._get_artist_info(item.get("artists", []), access_token)

            # 6. Generar datos de visualización MEJORADOS
            visualizer_data = self._generate_enhanced_visualizer_data(
                item, audio_features, audio_analysis, album_colors
            )

            # 7. Datos de movimiento inteligente
            movement_data = self._calculate_intelligent_movement(audio_features, audio_analysis)

            result = {
                "is_playing": raw_data.get("is_playing", False),
                "progress_ms": raw_data.get("progress_ms", 0),
                "item": item,
                "audio_features": audio_features,
                "audio_analysis": audio_analysis,
                "album_colors": album_colors,  # ✨ NUEVO: Colores del álbum
                "artist_info": artist_data,
                "visualizer": visualizer_data,
                "movement_rules": movement_data,  # ✨ NUEVO: Reglas de movimiento
                "track_mood": self._calculate_track_mood(audio_features, album_colors),
                "complexity_score": self._calculate_complexity_score(audio_features, audio_analysis)
            }

            print(f"[SpotifyService] 🎨 Colores extraídos: {album_colors.get('color_mood', 'unknown')}")
            print(f"[SpotifyService] 🎮 Reglas de movimiento: {len(movement_data.get('behaviors', []))} comportamientos")

            # ✅ CONVERTIR TODOS LOS TIPOS NUMPY ANTES DE RETORNAR
            result = self._convert_numpy_types(result)

            return result

        except Exception as e:
            print(f"[SpotifyService] 💥 Error en get_current_track_enhanced: {e}")
            import traceback
            traceback.print_exc()
            return None

    def _extract_album_colors(self, item: Dict) -> Dict:
        """Extrae colores de la portada del álbum"""
        try:
            if not item.get('album') or not item['album'].get('images'):
                return self._get_default_colors()

            images = item['album']['images']
            if not images:
                return self._get_default_colors()

            # Usar la imagen de mayor calidad (primera en la lista)
            image_url = images[0].get('url')
            if not image_url:
                return self._get_default_colors()

            print(f"[SpotifyService] 🎨 Extrayendo colores de: {image_url[:80]}...")

            # Usar el extractor avanzado
            colors = get_album_colors_from_url(image_url)

            # Convertir tipos numpy en los colores
            colors = self._convert_numpy_types(colors)

            # Añadir metadatos adicionales
            colors.update({
                "album_name": item['album'].get('name', 'Unknown'),
                "artist_name": item['album'].get('artists', [{}])[0].get('name', 'Unknown'),
                "release_date": item['album'].get('release_date', 'Unknown'),
                "image_url": image_url
            })

            return colors

        except Exception as e:
            print(f"[SpotifyService] ❌ Error extrayendo colores: {e}")
            return self._get_default_colors()

    def _get_default_colors(self) -> Dict:
        """Colores por defecto cuando falla la extracción"""
        return {
            "dominant_rgb": [34, 197, 94],  # Cambiado a lista para consistencia
            "dominant_hex": "#22c55e",
            "palette_rgb": [[34, 197, 94], [59, 130, 246], [168, 85, 247]],
            "palette_hex": ["#22c55e", "#3b82f6", "#a855f7"],
            "suggested_text_color": "#ffffff",
            "color_mood": "default",
            "contrast_ratio": 4.5,
            "album_name": "Unknown",
            "image_url": None
        }

    def _get_artist_info(self, artists: List, access_token: str) -> Dict:
        """Obtiene información adicional de artistas"""
        try:
            if not artists:
                return {}

            # Obtener info del artista principal
            main_artist = artists[0]
            artist_id = main_artist.get('id')

            if not artist_id:
                return {"genres": [], "popularity": 0}

            # Llamar a la API de Spotify para el artista
            response = self._get(f"/artists/{artist_id}", access_token)
            if response.status_code != 200:
                return {"genres": [], "popularity": 0}

            artist_data = response.json()

            return {
                "genres": artist_data.get("genres", [])[:5],
                "popularity": artist_data.get("popularity", 0),
                "followers": artist_data.get("followers", {}).get("total", 0),
                "main_genre": artist_data.get("genres", [""])[0] if artist_data.get("genres") else ""
            }

        except Exception as e:
            print(f"[SpotifyService] Error obteniendo artista: {e}")
            return {"genres": [], "popularity": 0}

    def _generate_enhanced_visualizer_data(self, item: Dict, audio_features: Dict,
                                           audio_analysis: Dict, album_colors: Dict) -> Dict:
        """Genera datos mejorados para el visualizador"""

        # Usar audio features o valores por defecto
        energy = audio_features.get("energy", 0.5)
        tempo = audio_features.get("tempo", 120)
        danceability = audio_features.get("danceability", 0.5)
        valence = audio_features.get("valence", 0.5)
        acousticness = audio_features.get("acousticness", 0.5)
        instrumentalness = audio_features.get("instrumentalness", 0)
        liveness = audio_features.get("liveness", 0.2)
        speechiness = audio_features.get("speechiness", 0.1)
        loudness = audio_features.get("loudness", -10)
        key = audio_features.get("key", 0)
        mode = audio_features.get("mode", 1)

        # Calcular número de nodos basado en audio features
        base_nodes = 80
        node_multiplier = 1.0

        # Más nodos para música energética y compleja
        if energy > 0.7:
            node_multiplier += 0.5
        if tempo > 140:
            node_multiplier += 0.3
        if instrumentalness > 0.5:
            node_multiplier += 0.4
        if speechiness > 0.3:
            node_multiplier += 0.2

        total_nodes = int(base_nodes * node_multiplier)

        # Calcular comportamientos basados en características
        behaviors = []

        if danceability > 0.7:
            behaviors.append("dancing")
        if energy > 0.8:
            behaviors.append("energetic")
        if valence > 0.7:
            behaviors.append("happy")
        elif valence < 0.3:
            behaviors.append("melancholic")
        if acousticness > 0.7:
            behaviors.append("organic")
        if instrumentalness > 0.7:
            behaviors.append("instrumental")
        if liveness > 0.5:
            behaviors.append("live")
        if speechiness > 0.5:
            behaviors.append("vocal")

        if not behaviors:
            behaviors = ["balanced"]

        # Determinar tipo de movimiento
        movement_type = "flow"
        if tempo > 160:
            movement_type = "staccato"
        elif danceability > 0.7:
            movement_type = "bouncy"
        elif valence < 0.3:
            movement_type = "melancholic"

        # Calcular complejidad
        complexity = (energy * 0.3 + danceability * 0.2 +
                      (1 - acousticness) * 0.2 + (1 - instrumentalness) * 0.3)

        return {
            "node_count": total_nodes,
            "base_size": float(2.5 + energy * 3),
            "connection_distance": float(100 + danceability * 100 - acousticness * 50),
            "movement_speed": float(20 + energy * 60 + (tempo - 100) * 0.3),
            "behaviors": behaviors,
            "movement_type": movement_type,
            "pulse_intensity": float(energy * 0.8 + liveness * 0.2),
            "swirl_intensity": float(instrumentalness * 0.7 + valence * 0.3),
            "chaos_level": float(speechiness * 0.5 + liveness * 0.5),
            "attraction_force": float(danceability * 0.6 + energy * 0.4),
            "color_intensity": float(0.5 + energy * 0.5),
            "complexity": float(complexity),
            "color_palette": album_colors.get("palette_hex", ["#22c55e", "#3b82f6"]),
            "dominant_color": album_colors.get("dominant_hex", "#22c55e"),
            "accent_color": album_colors.get("palette_hex", ["#f97316"])[2] if len(
                album_colors.get("palette_hex", [])) > 2 else "#f97316"
        }

    def _calculate_intelligent_movement(self, audio_features: Dict, audio_analysis: Dict) -> Dict:
        """Calcula reglas de movimiento inteligente basadas en análisis de audio"""

        # Valores por defecto
        energy = audio_features.get("energy", 0.5)
        tempo = audio_features.get("tempo", 120)
        danceability = audio_features.get("danceability", 0.5)
        valence = audio_features.get("valence", 0.5)
        key = audio_features.get("key", 0)

        # Obtener beats y secciones del análisis
        beats = audio_analysis.get("beats", [])
        sections = audio_analysis.get("sections", [])

        # Calcular densidad de beats
        duration_sec = max(audio_features.get("duration_ms", 180000) / 1000, 1)
        beat_density = float(len(beats) / duration_sec)

        # Determinar patrón rítmico
        rhythmic_pattern = "steady"
        if beat_density > 4:
            rhythmic_pattern = "dense"
        elif beat_density < 2:
            rhythmic_pattern = "sparse"

        # Determinar tipo de flujo
        flow_type = "smooth"
        if tempo > 140 and energy > 0.7:
            flow_type = "staccato"
        elif danceability > 0.7:
            flow_type = "bouncy"
        elif valence < 0.3:
            flow_type = "flowing"

        # Calcular variación de secciones
        section_variation = 0.0
        if len(sections) > 1:
            loudnesses = [s.get("loudness", -10) for s in sections]
            section_variation = float(max(loudnesses) - min(loudnesses))

        attraction_points = self._calculate_attraction_points(beats, sections)

        # Asegurar que todos los valores sean tipos nativos
        attraction_points = self._convert_numpy_types(attraction_points)

        return {
            "rhythmic_pattern": rhythmic_pattern,
            "flow_type": flow_type,
            "beat_density": float(beat_density),
            "section_variation": float(section_variation),
            "should_pulse_on_beat": energy > 0.6,
            "pulse_strength": float(energy * 0.8),
            "should_swirl": danceability > 0.5,
            "swirl_direction": "clockwise" if key % 2 == 0 else "counterclockwise",
            "attraction_points": attraction_points,
            "movement_wave": {
                "amplitude": float(energy * 40),
                "frequency": float(tempo / 120),
                "phase": float(key * 0.1)
            }
        }

    def _calculate_attraction_points(self, beats: List, sections: List) -> List[Dict]:
        """Calcula puntos de atracción basados en la estructura de la canción"""
        attraction_points = []

        # Punto central siempre
        attraction_points.append({
            "x": 0.5,
            "y": 0.5,
            "strength": 0.3,
            "radius": 0.4,
            "type": "center"
        })

        # Puntos basados en beats (si hay datos)
        if beats and len(beats) > 10:
            # Tomar algunos beats importantes
            important_beats = beats[::max(1, len(beats) // 8)]  # ~8 beats importantes

            for i, beat in enumerate(important_beats[:8]):
                if i >= 8:
                    break

                angle = (i / 8) * 2 * math.pi
                distance = 0.3 + (i % 3) * 0.1

                attraction_points.append({
                    "x": float(0.5 + math.cos(angle) * distance),
                    "y": float(0.5 + math.sin(angle) * distance),
                    "strength": float(0.5 + (i % 3) * 0.2),
                    "radius": float(0.1 + (i % 2) * 0.05),
                    "type": "beat",
                    "beat_index": int(i)
                })

        # Puntos basados en secciones (si hay datos)
        if sections and len(sections) > 1:
            for i, section in enumerate(sections[:4]):  # Máximo 4 secciones
                if i >= 4:
                    break

                # Posición en círculo
                angle = (i / len(sections)) * 2 * math.pi + 0.785  # Offset 45°
                distance = 0.4

                attraction_points.append({
                    "x": float(0.5 + math.cos(angle) * distance),
                    "y": float(0.5 + math.sin(angle) * distance),
                    "strength": float(0.4 + section.get("loudness", -5) / 50),
                    "radius": 0.15,
                    "type": "section",
                    "section_index": int(i)
                })

        return attraction_points

    def _calculate_track_mood(self, audio_features: Dict, album_colors: Dict) -> str:
        """Calcula el mood general de la canción combinando audio y colores"""

        energy = audio_features.get("energy", 0.5)
        valence = audio_features.get("valence", 0.5)
        danceability = audio_features.get("danceability", 0.5)
        tempo = audio_features.get("tempo", 120)
        acousticness = audio_features.get("acousticness", 0.5)

        color_mood = album_colors.get("color_mood", "balanced")

        # Combinar mood de audio y colores
        if energy > 0.8 and tempo > 140:
            if valence > 0.7:
                return "ecstatic"
            else:
                return "intense"
        elif valence > 0.7 and danceability > 0.7:
            return "joyful"
        elif valence < 0.3 and energy < 0.4:
            return "melancholic"
        elif acousticness > 0.7:
            return "serene"
        elif color_mood in ["fiery", "sunny"]:
            return "vibrant"
        elif color_mood in ["oceanic", "deep_blue"]:
            return "calm"
        elif color_mood == "mystic":
            return "mystical"

        return "balanced"

    def _calculate_complexity_score(self, audio_features: Dict, audio_analysis: Dict) -> float:
        """Calcula un score de complejidad musical (0-1)"""

        energy = audio_features.get("energy", 0.5)
        danceability = audio_features.get("danceability", 0.5)
        valence = audio_features.get("valence", 0.5)
        acousticness = audio_features.get("acousticness", 0.5)
        instrumentalness = audio_features.get("instrumentalness", 0)
        speechiness = audio_features.get("speechiness", 0.1)
        liveness = audio_features.get("liveness", 0.2)

        # Componentes de complejidad
        rhythmic_complexity = min(1.0, len(audio_analysis.get("beats", [])) / 100)
        harmonic_complexity = 1.0 - acousticness  # Menos acústico = más complejo
        textural_complexity = (1.0 - instrumentalness) * 0.5 + speechiness * 0.5
        dynamic_complexity = liveness * 0.7 + energy * 0.3

        # Ponderar componentes
        complexity = (
                rhythmic_complexity * 0.25 +
                harmonic_complexity * 0.25 +
                textural_complexity * 0.25 +
                dynamic_complexity * 0.25
        )

        return float(round(complexity, 2))

    def _get_idle_visualizer_data(self) -> Dict:
        """Datos para cuando no hay música reproduciéndose"""
        return {
            "node_count": 60,
            "base_size": 2.0,
            "connection_distance": 80.0,
            "movement_speed": 15.0,
            "behaviors": ["idle", "floating"],
            "movement_type": "gentle",
            "pulse_intensity": 0.2,
            "swirl_intensity": 0.3,
            "chaos_level": 0.1,
            "attraction_force": 0.2,
            "color_intensity": 0.3,
            "complexity": 0.3,
            "color_palette": ["#374151", "#6b7280", "#9ca3af"],
            "dominant_color": "#374151",
            "accent_color": "#6b7280"
        }


# Instancia global mejorada
spotify_service = EnhancedSpotifyService()


# Alias para compatibilidad
def get_current_track_full(access_token: str) -> Dict | None:
    return spotify_service.get_current_track_enhanced(access_token)