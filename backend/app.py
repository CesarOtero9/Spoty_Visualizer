# backend/app.py
from __future__ import annotations

import json
import os
import math
import numpy as np
from typing import Dict, Any, List

from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from dotenv import load_dotenv

from auth.spotify_oauth import FRONTEND_URL
from services.spotify_service import EnhancedSpotifyService
from websockets.live_visualizer import socketio, init_socketio

# ================== Configuración básica ==================

load_dotenv()

app = Flask(__name__)

# JSON encoder personalizado para manejar tipos numpy
class NumpyJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (np.integer, np.int32, np.int64)):
            return int(obj)
        elif isinstance(obj, (np.floating, np.float32, np.float64)):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, np.bool_):
            return bool(obj)
        elif hasattr(obj, 'tolist'):  # Para otros objetos numpy-like
            return obj.tolist()
        return super(NumpyJSONEncoder, self).default(obj)

app.json_encoder = NumpyJSONEncoder

# ✅ CONFIGURACIÓN CORS
CORS(
    app,
    origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        FRONTEND_URL,
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization", "X-Refresh-Token", "Accept"],
    methods=["GET", "POST", "OPTIONS", "PUT", "DELETE"]
)

# Integrar SocketIO con la app
init_socketio(app)

print("🚀 Iniciando servidor Spotify Visualizer PRO...")
print(f"📍 FRONTEND_URL: {FRONTEND_URL}")
print(f"📍 SPOTIFY_REDIRECT_URI: {os.getenv('SPOTIFY_REDIRECT_URI')}")
print("=" * 50)
print("🔍 DEBUG - Verificación de variables de entorno")
print(f"SPOTIFY_CLIENT_ID: {'✓' if os.getenv('SPOTIFY_CLIENT_ID') else '✗'}")
print(f"SPOTIFY_CLIENT_ID length: {len(os.getenv('SPOTIFY_CLIENT_ID', ''))}")
print(f"SPOTIFY_REDIRECT_URI: {os.getenv('SPOTIFY_REDIRECT_URI')}")
print("=" * 50)

# Inicializar el servicio mejorado
spotify_service = EnhancedSpotifyService()


# ================== Helpers internos ==================

def _get_access_token_from_header() -> str | None:
    """
    Extrae el access_token del header Authorization: Bearer <token>.
    """
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header.replace("Bearer ", "").strip()
    return None


def _callback_success_html(data: dict) -> str:
    """
    Genera HTML que cierra la ventana y envía datos al window.opener (frontend).
    """
    # Usar el encoder personalizado
    json_data = json.dumps(data, cls=NumpyJSONEncoder)

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Spotify Auth Complete</title>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                text-align: center;
            }}
            .container {{
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                padding: 40px;
                border-radius: 20px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                max-width: 400px;
            }}
            .spinner {{
                border: 4px solid rgba(255, 255, 255, 0.3);
                border-top: 4px solid #fff;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            }}
            @keyframes spin {{
                0% {{ transform: rotate(0deg); }}
                100% {{ transform: rotate(360deg); }}
            }}
            h1 {{
                margin: 0 0 10px 0;
                font-size: 24px;
            }}
            p {{
                margin: 0;
                opacity: 0.8;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="spinner"></div>
            <h1>✅ Authentication Successful</h1>
            <p>You can now close this window</p>
            <p style="font-size: 12px; margin-top: 20px; opacity: 0.6;">
                This window will close automatically...
            </p>
        </div>

        <script>
            // Enviar datos al window.opener (la ventana principal)
            try {{
                if (window.opener && !window.opener.closed) {{
                    // Enviar mensaje con los datos de autenticación
                    window.opener.postMessage({{
                        type: 'spotify-auth-callback',
                        data: {json_data}
                    }}, '{FRONTEND_URL}');

                    console.log('✅ Authentication data sent to parent window');

                    // Cerrar esta ventana después de 1 segundo
                    setTimeout(() => {{
                        window.close();
                    }}, 1000);
                }} else {{
                    console.warn('⚠️ No opener window found');
                    document.body.innerHTML = '<div class="container"><h1>⚠️ Error</h1><p>Please return to the main app and try again.</p></div>';
                }}
            }} catch (error) {{
                console.error('❌ Error sending auth data:', error);
                document.body.innerHTML = '<div class="container"><h1>❌ Error</h1><p>Authentication failed. Please close this window and try again.</p></div>';
            }}

            // También permitir cerrar manualmente si algo falla
            setTimeout(() => {{
                if (!window.closed) {{
                    window.close();
                }}
            }}, 3000);
        </script>
    </body>
    </html>
    """
    return html


def _callback_error_html(error_message: str) -> str:
    """
    Genera HTML para mostrar error en el callback.
    """
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Spotify Auth Error</title>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                color: white;
                text-align: center;
            }}
            .container {{
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                padding: 40px;
                border-radius: 20px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                max-width: 400px;
            }}
            h1 {{
                margin: 0 0 10px 0;
                font-size: 24px;
            }}
            p {{
                margin: 0;
                opacity: 0.8;
            }}
            button {{
                background: white;
                color: #f5576c;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                margin-top: 20px;
                cursor: pointer;
                font-weight: bold;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>❌ Authentication Failed</h1>
            <p>{error_message}</p>
            <button onclick="window.close()">Close Window</button>
        </div>
    </body>
    </html>
    """
    return html


def _calculate_attraction_points(beats: List, sections: List) -> List[Dict]:
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
                "x": 0.5 + math.cos(angle) * distance,
                "y": 0.5 + math.sin(angle) * distance,
                "strength": 0.5 + (i % 3) * 0.2,
                "radius": 0.1 + (i % 2) * 0.05,
                "type": "beat",
                "beat_index": i
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
                "x": 0.5 + math.cos(angle) * distance,
                "y": 0.5 + math.sin(angle) * distance,
                "strength": 0.4 + section.get("loudness", -5) / 50,
                "radius": 0.15,
                "type": "section",
                "section_index": i
            })

    return attraction_points


# ================== Rutas básicas ==================

@app.route("/")
def home():
    return jsonify({"message": "Spotify Visualizer PRO API", "status": "running", "version": "2.0"})


# ================== OAuth ==================

@app.route("/auth/login")
def login():
    """
    Devuelve la URL para iniciar sesión en Spotify.
    El frontend abre esta URL en una nueva pestaña/ventana.
    """
    try:
        print("🔍 /auth/login llamado")
        auth_url = spotify_service.get_auth_url(show_dialog=True)

        print(f"🔗 URL de autenticación generada: {auth_url[:100]}...")

        return jsonify({
            "auth_url": auth_url,
            "status": "success",
            "debug": {
                "client_id_loaded": bool(os.getenv('SPOTIFY_CLIENT_ID')),
                "redirect_uri": os.getenv('SPOTIFY_REDIRECT_URI')
            }
        })

    except Exception as e:
        print(f"💥 Error COMPLETO en /auth/login: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "error": f"No se pudo generar la URL de autenticación: {str(e)}",
            "debug_info": {
                "client_id_present": bool(os.getenv('SPOTIFY_CLIENT_ID')),
                "redirect_uri_present": bool(os.getenv('SPOTIFY_REDIRECT_URI'))
            }
        }), 500


@app.route("/callback")
def callback():
    """
    Endpoint de callback de Spotify (REDIRECT_URI).
    Devuelve un HTML que cierra la ventana y pasa los tokens al opener (frontend).
    """
    try:
        auth_code = request.args.get("code")
        error = request.args.get("error")

        print(f"📞 Callback recibido - code: {'✓' if auth_code else '✗'}, error: {error}")

        if error:
            print(f"❌ Error en callback: {error}")
            return _callback_error_html(f"Spotify error: {error}")

        if not auth_code:
            print("❌ No se recibió código de autorización")
            return _callback_error_html("No authorization code")

        tokens = spotify_service.exchange_code_for_tokens(auth_code)
        if not tokens:
            print("❌ Falló el intercambio de tokens")
            return _callback_error_html("Authentication failed - token exchange failed")

        print("🎉 ¡Autenticación completada exitosamente!")

        access_token = tokens.get("access_token")
        refresh_token_value = tokens.get("refresh_token")
        expires_in = tokens.get("expires_in")
        token_type = tokens.get("token_type", "Bearer")

        # Obtener información del usuario
        user_profile = None
        if access_token:
            user_profile = spotify_service.get_user_profile(access_token)

        # Preparar datos para enviar al frontend
        callback_data = {
            "access_token": access_token,
            "refresh_token": refresh_token_value,
            "expires_in": expires_in,
            "token_type": token_type,
            "success": True,
        }

        if user_profile:
            callback_data["user"] = {
                "id": user_profile.get("id"),
                "name": user_profile.get("display_name") or user_profile.get("id"),
                "email": user_profile.get("email"),
                "avatar": user_profile.get("images", [{}])[0].get("url")
                if user_profile.get("images")
                else None,
            }

        # Devolver HTML que cierra la ventana y pasa datos al opener
        return _callback_success_html(callback_data)

    except Exception as e:
        print(f"💥 Excepción en callback: {e}")
        return _callback_error_html("Internal server error")


@app.route("/auth/refresh", methods=["POST"])
def refresh():
    """
    Endpoint opcional para refrescar el access_token usando el refresh_token.
    """
    try:
        data = request.get_json(silent=True) or {}
        refresh_token_body = data.get("refresh_token")

        if not refresh_token_body:
            return jsonify({"error": "No refresh_token provided"}), 400

        tokens = spotify_service.refresh_access_token(refresh_token_body)
        if not tokens:
            return jsonify({"error": "Could not refresh token"}), 400

        return jsonify(tokens), 200

    except Exception as e:
        print(f"💥 Error en /auth/refresh: {e}")
        return jsonify({"error": "Internal server error"}), 500


# ================== Endpoints protegidos ==================

@app.route('/api/current-track')
def current_track():
    access_token = _get_access_token_from_header()

    print(f"🔍 [BACKEND] Token recibido: {'✓' if access_token else '✗'}")

    if not access_token:
        return jsonify({"error": "No access token"}), 401

    try:
        # Usar el servicio mejorado
        track_data = spotify_service.get_current_track_enhanced(access_token)

        print(f"🔍 [BACKEND] Track data recibido de Spotify: {'✓' if track_data else '✗'}")

        if track_data:
            print(f"🎵 [BACKEND] Canción: {track_data.get('item', {}).get('name', 'No name')}")
            print(f"▶️ [BACKEND] Reproduciendo: {track_data.get('is_playing', False)}")
            print(f"🎨 [BACKEND] Album colors: {'✓' if 'album_colors' in track_data else '✗'}")

        # Si no hay canción reproduciéndose
        if track_data is None or track_data.get('is_playing') is False:
            print("⏸️ [BACKEND] No hay reproducción activa")
            return jsonify({
                "is_playing": False,
                "message": "No track playing",
                "idle_data": track_data.get("visualizer", {}) if track_data else {},
                "debug": {
                    "has_token": bool(access_token),
                    "token_length": len(access_token) if access_token else 0
                }
            })

        # Asegurar que tenemos datos de movimiento
        if 'movement_rules' not in track_data or not track_data['movement_rules']:
            # Calcular puntos de atracción si no están en los datos
            if 'audio_analysis' in track_data:
                beats = track_data['audio_analysis'].get('beats', [])
                sections = track_data['audio_analysis'].get('sections', [])
                attraction_points = _calculate_attraction_points(beats, sections)

                if 'movement_rules' not in track_data:
                    track_data['movement_rules'] = {}
                track_data['movement_rules']['attraction_points'] = attraction_points

        # ✅ Usar jsonify que utilizará nuestro encoder personalizado
        return jsonify(track_data)

    except Exception as e:
        print(f"💥 [BACKEND] Error en /api/current-track: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "error": str(e),
            "debug": "Exception occurred",
            "type": str(type(e))
        }), 500


@app.route("/api/user-profile")
def user_profile():
    access_token = _get_access_token_from_header()
    if not access_token:
        return jsonify({"error": "No access token"}), 401

    try:
        user_data = spotify_service.get_user_profile(access_token)
        if user_data:
            return jsonify(user_data), 200
        else:
            return jsonify({"error": "Could not fetch user profile"}), 400
    except Exception as e:
        print(f"💥 Error en /api/user-profile: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/top-tracks")
def top_tracks():
    access_token = _get_access_token_from_header()
    if not access_token:
        return jsonify({"error": "No access token"}), 401

    try:
        time_range = request.args.get("time_range", "short_term")
        limit = int(request.args.get("limit", 10))

        tracks_data = spotify_service.get_top_tracks(access_token, time_range, limit)
        if tracks_data:
            return jsonify(tracks_data), 200
        else:
            return jsonify({"error": "Could not fetch top tracks"}), 400
    except Exception as e:
        print(f"💥 Error en /api/top-tracks: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/top-artists")
def top_artists():
    access_token = _get_access_token_from_header()
    if not access_token:
        return jsonify({"error": "No access token"}), 401

    try:
        time_range = request.args.get("time_range", "short_term")
        limit = int(request.args.get("limit", 10))

        artists_data = spotify_service.get_top_artists(access_token, time_range, limit)
        if artists_data:
            return jsonify(artists_data), 200
        else:
            return jsonify({"error": "Could not fetch top artists"}), 400
    except Exception as e:
        print(f"💥 Error en /api/top-artists: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/recent-tracks")
def recent_tracks():
    access_token = _get_access_token_from_header()
    if not access_token:
        return jsonify({"error": "No access token"}), 401

    try:
        limit = int(request.args.get("limit", 20))

        recent_data = spotify_service.get_recent_tracks(access_token, limit)
        if recent_data:
            return jsonify(recent_data), 200
        else:
            return jsonify({"error": "Could not fetch recent tracks"}), 400
    except Exception as e:
        print(f"💥 Error en /api/recent-tracks: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/debug-visualizer')
def debug_visualizer():
    """Endpoint para debug - ver qué datos está recibiendo el frontend"""
    access_token = _get_access_token_from_header()
    if not access_token:
        return jsonify({"error": "No access token"}), 401

    try:
        track_data = spotify_service.get_current_track_enhanced(access_token)

        if not track_data:
            return jsonify({"error": "No track data"})

        # Devolver solo los campos relevantes para el visualizador
        debug_info = {
            "has_audio_features": "audio_features" in track_data,
            "has_album_colors": "album_colors" in track_data,
            "has_movement_rules": "movement_rules" in track_data,
            "audio_features": track_data.get("audio_features", {}),
            "album_colors": track_data.get("album_colors", {}),
            "movement_rules": track_data.get("movement_rules", {}),
            "visualizer_data": track_data.get("visualizer", {}),
            "item_name": track_data.get("item", {}).get("name", "No item"),
            "is_playing": track_data.get("is_playing", False),
            "track_mood": track_data.get("track_mood", "unknown"),
            "complexity_score": track_data.get("complexity_score", 0)
        }

        return jsonify(debug_info)

    except Exception as e:
        print(f"💥 Error en /api/debug-visualizer: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/stats")
def user_stats():
    """
    Ejemplo de endpoint de stats.
    """
    access_token = _get_access_token_from_header()
    if not access_token:
        return jsonify({"error": "No access token"}), 401

    try:
        top_tracks = spotify_service.get_top_tracks(access_token, "medium_term", 50)
        top_artists = spotify_service.get_top_artists(access_token, "medium_term", 50)
        recent_tracks = spotify_service.get_recent_tracks(access_token, 50)

        total_tracks = len(recent_tracks.get("items", [])) if recent_tracks else 0
        total_artists = len(top_artists.get("items", [])) if top_artists else 0

        stats = {
            "total_tracks_played": total_tracks,
            "total_artists": total_artists,
            "audio_features": {
                "avg_energy": 0.65,
                "avg_tempo": 125,
                "avg_danceability": 0.72,
            },
        }

        return jsonify(stats), 200

    except Exception as e:
        print(f"💥 Error en /api/stats: {e}")
        return jsonify({
            "total_tracks_played": 156,
            "total_artists": 42,
            "audio_features": {
                "avg_energy": 0.68,
                "avg_tempo": 128,
                "avg_danceability": 0.75,
            },
        }), 200


@app.route("/api/album-colors")
def album_colors():
    """
    Endpoint directo para extraer colores de un álbum (para testing).
    """
    try:
        image_url = request.args.get("image_url")
        if not image_url:
            return jsonify({"error": "No image_url provided"}), 400

        print(f"🎨 Extrayendo colores de: {image_url}")

        # Usar el extractor directamente
        from utils.album_color_extractor import get_album_colors_from_url
        colors = get_album_colors_from_url(image_url)

        return jsonify({
            "success": True,
            "image_url": image_url,
            "colors": colors
        })

    except Exception as e:
        print(f"💥 Error en /api/album-colors: {e}")
        return jsonify({"error": str(e)}), 500


# ================== Entry point ==================

if __name__ == "__main__":
    print("🎵 Servidor Spotify Visualizer PRO iniciado!")
    print("📍 Puerto: 8080")
    print("🔗 Redirect URI:", os.getenv("SPOTIFY_REDIRECT_URI"))
    print("🎨 Sistema de colores avanzado: ✓")
    print("🎮 Sistema de nodos creativo: ✓")
    socketio.run(app, port=8080, debug=True, allow_unsafe_werkzeug=True)