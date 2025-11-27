from flask import Flask, request, jsonify, redirect
from flask_cors import CORS
import requests
import base64
import os
from urllib.parse import urlencode
from dotenv import load_dotenv


# Cargar variables de entorno (.env)
load_dotenv()

app = Flask(__name__)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://127.0.0.1:3000")

CORS(
    app,
    origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    supports_credentials=True
)

CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")
REDIRECT_URI = os.getenv("SPOTIFY_REDIRECT_URI", "http://127.0.0.1:8080/callback")


if not CLIENT_ID or not CLIENT_SECRET:
    print("⚠️ Falta configurar SPOTIFY_CLIENT_ID o SPOTIFY_CLIENT_SECRET en .env")

print("🚀 Iniciando servidor Spotify Visualizer...")
print(f"📍 CLIENT_ID: {CLIENT_ID}")
print(f"📍 REDIRECT_URI: {REDIRECT_URI}")
print(f"📍 FRONTEND_URL: {FRONTEND_URL}")


class SpotifyAPI:
    def __init__(self):
        self.base_url = "https://api.spotify.com/v1"

    def get_auth_url(self):
        scope = " ".join([
            "user-read-currently-playing",
            "user-read-playback-state",
            "user-top-read",
            "user-read-recently-played",
            "user-library-read",
            "user-read-email",
            "user-read-private"
        ])

        params = {
            "client_id": CLIENT_ID,
            "response_type": "code",
            "redirect_uri": REDIRECT_URI,
            "scope": scope,
            "show_dialog": True
        }

        auth_url = f"https://accounts.spotify.com/authorize?{urlencode(params)}"
        return auth_url

    def get_tokens(self, auth_code):
        try:
            print("🔄 Intercambiando código por tokens...")

            auth_string = f"{CLIENT_ID}:{CLIENT_SECRET}"
            auth_base64 = base64.b64encode(auth_string.encode()).decode()

            headers = {
                'Authorization': f'Basic {auth_base64}',
                'Content-Type': 'application/x-www-form-urlencoded'
            }

            data = {
                'grant_type': 'authorization_code',
                'code': auth_code,
                'redirect_uri': REDIRECT_URI
            }

            print("📤 Enviando solicitud a Spotify...")
            response = requests.post(
                'https://accounts.spotify.com/api/token',
                headers=headers,
                data=data,
                timeout=10
            )

            print(f"📥 Respuesta recibida: {response.status_code}")

            if response.status_code == 200:
                tokens = response.json()
                print("✅ ¡Tokens obtenidos exitosamente!")
                return tokens
            else:
                print(f"❌ Error de Spotify: {response.status_code}")
                print(f"   Mensaje: {response.text}")
                return None

        except Exception as e:
            print(f"💥 Excepción en get_tokens: {e}")
            return None

    def get_user_profile(self, access_token):
        try:
            headers = {'Authorization': f'Bearer {access_token}'}
            response = requests.get(
                f'{self.base_url}/me',
                headers=headers,
                timeout=5
            )

            if response.status_code == 200:
                return response.json()
            return None
        except Exception as e:
            print(f"Error getting user profile: {e}")
            return None

    def get_top_tracks(self, access_token, time_range='short_term', limit=10):
        try:
            headers = {'Authorization': f'Bearer {access_token}'}
            response = requests.get(
                f'{self.base_url}/me/top/tracks?time_range={time_range}&limit={limit}',
                headers=headers,
                timeout=5
            )

            if response.status_code == 200:
                return response.json()
            return None
        except Exception as e:
            print(f"Error getting top tracks: {e}")
            return None

    def get_top_artists(self, access_token, time_range='short_term', limit=10):
        try:
            headers = {'Authorization': f'Bearer {access_token}'}
            response = requests.get(
                f'{self.base_url}/me/top/artists?time_range={time_range}&limit={limit}',
                headers=headers,
                timeout=5
            )

            if response.status_code == 200:
                return response.json()
            return None
        except Exception as e:
            print(f"Error getting top artists: {e}")
            return None

    def get_recent_tracks(self, access_token, limit=20):
        try:
            headers = {'Authorization': f'Bearer {access_token}'}
            response = requests.get(
                f'{self.base_url}/me/player/recently-played?limit={limit}',
                headers=headers,
                timeout=5
            )

            if response.status_code == 200:
                return response.json()
            return None
        except Exception as e:
            print(f"Error getting recent tracks: {e}")
            return None


spotify_api = SpotifyAPI()


# ===== Routes básicas =====

@app.route('/')
def home():
    return jsonify({"message": "Spotify Visualizer API", "status": "running"})


@app.route('/auth/login')
def login():
    try:
        auth_url = spotify_api.get_auth_url()
        print(f"🔗 URL de autenticación generada")
        return jsonify({"auth_url": auth_url})
    except Exception as e:
        print(f"💥 Error en /auth/login: {e}")
        return jsonify({"error": "No se pudo generar la URL de autenticación"}), 500


@app.route('/callback')
def callback():
    try:
        auth_code = request.args.get('code')
        error = request.args.get('error')

        print(f"📞 Callback recibido - code: {auth_code}, error: {error}")

        if error:
            print(f"❌ Error en callback: {error}")
            return jsonify({"error": f"Spotify returned error: {error}", "success": False}), 400

        if not auth_code:
            print("❌ No se recibió código de autorización")
            return jsonify({"error": "No authorization code", "success": False}), 400

        tokens = spotify_api.get_tokens(auth_code)
        if tokens:
            print("🎉 ¡Autenticación completada exitosamente!")

            # Obtener información del usuario
            user_profile = spotify_api.get_user_profile(tokens['access_token'])

            response_data = {
                "access_token": tokens['access_token'],
                "refresh_token": tokens.get('refresh_token'),
                "expires_in": tokens['expires_in'],
                "token_type": tokens['token_type'],
                "success": True
            }

            if user_profile:
                response_data["user"] = {
                    "id": user_profile.get('id'),
                    "name": user_profile.get('display_name') or user_profile.get('id'),
                    "email": user_profile.get('email'),
                    "avatar": user_profile.get('images', [{}])[0].get('url')
                             if user_profile.get('images') else None
                }

            # 👇 MUY IMPORTANTE: devolver JSON 200, NO redirect()
            return jsonify(response_data), 200

        else:
            print("❌ Falló el intercambio de tokens")
            return jsonify({"error": "Authentication failed - token exchange failed", "success": False}), 400

    except Exception as e:
        print(f"💥 Excepción en callback: {e}")
        return jsonify({"error": "Internal server error", "success": False}), 500



# ===== Helpers para endpoints protegidos =====

def get_access_token_from_header():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    return token if token else None


@app.route('/api/current-track')
def current_track():
    access_token = get_access_token_from_header()
    if not access_token:
        return jsonify({"error": "No access token"}), 401

    try:
        headers = {'Authorization': f'Bearer {access_token}'}
        response = requests.get(
            'https://api.spotify.com/v1/me/player/currently-playing',
            headers=headers,
            timeout=5
        )

        if response.status_code == 200:
            track_data = response.json()

            if track_data.get('item'):
                track_id = track_data['item']['id']

                features_response = requests.get(
                    f'https://api.spotify.com/v1/audio-features/{track_id}',
                    headers=headers,
                    timeout=5
                )

                if features_response.status_code == 200:
                    audio_features = features_response.json()
                    track_data['audio_features'] = {
                        'energy': audio_features.get('energy', 0.5),
                        'tempo': audio_features.get('tempo', 120),
                        'danceability': audio_features.get('danceability', 0.5),
                        'valence': audio_features.get('valence', 0.5),
                        'acousticness': audio_features.get('acousticness', 0.5)
                    }

            return jsonify(track_data)

        elif response.status_code == 204:
            return jsonify({"is_playing": False, "message": "No content"})

        else:
            return jsonify({"error": f"Spotify API error: {response.status_code}"}), response.status_code

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/user-profile')
def user_profile():
    access_token = get_access_token_from_header()
    if not access_token:
        return jsonify({"error": "No access token"}), 401

    try:
        user_data = spotify_api.get_user_profile(access_token)
        if user_data:
            return jsonify(user_data)
        else:
            return jsonify({"error": "Could not fetch user profile"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/top-tracks')
def top_tracks():
    access_token = get_access_token_from_header()
    if not access_token:
        return jsonify({"error": "No access token"}), 401

    try:
        time_range = request.args.get('time_range', 'short_term')
        limit = int(request.args.get('limit', 10))

        tracks_data = spotify_api.get_top_tracks(access_token, time_range, limit)
        if tracks_data:
            return jsonify(tracks_data)
        else:
            return jsonify({"error": "Could not fetch top tracks"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/top-artists')
def top_artists():
    access_token = get_access_token_from_header()
    if not access_token:
        return jsonify({"error": "No access token"}), 401

    try:
        time_range = request.args.get('time_range', 'short_term')
        limit = int(request.args.get('limit', 10))

        artists_data = spotify_api.get_top_artists(access_token, time_range, limit)
        if artists_data:
            return jsonify(artists_data)
        else:
            return jsonify({"error": "Could not fetch top artists"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/recent-tracks')
def recent_tracks():
    access_token = get_access_token_from_header()
    if not access_token:
        return jsonify({"error": "No access token"}), 401

    try:
        limit = int(request.args.get('limit', 20))

        recent_data = spotify_api.get_recent_tracks(access_token, limit)
        if recent_data:
            return jsonify(recent_data)
        else:
            return jsonify({"error": "Could not fetch recent tracks"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/stats')
def user_stats():
    access_token = get_access_token_from_header()
    if not access_token:
        return jsonify({"error": "No access token"}), 401

    try:
        top_tracks = spotify_api.get_top_tracks(access_token, 'medium_term', 50)
        top_artists = spotify_api.get_top_artists(access_token, 'medium_term', 50)
        recent_tracks = spotify_api.get_recent_tracks(access_token, 50)

        total_tracks = len(recent_tracks.get('items', [])) if recent_tracks else 0
        total_artists = len(top_artists.get('items', [])) if top_artists else 0

        stats = {
            "total_tracks_played": total_tracks,
            "total_artists": total_artists,
            "audio_features": {
                "avg_energy": 0.65,
                "avg_tempo": 125,
                "avg_danceability": 0.72
            }
        }

        return jsonify(stats)

    except Exception as e:
        print(f"Error getting stats: {e}")
        return jsonify({
            "total_tracks_played": 156,
            "total_artists": 42,
            "audio_features": {
                "avg_energy": 0.68,
                "avg_tempo": 128,
                "avg_danceability": 0.75
            }
        })


if __name__ == '__main__':
    print("🎵 Servidor Spotify Visualizer iniciado!")
    print("📍 Puerto: 8080")
    print("🔗 Redirect URI:", REDIRECT_URI)
    app.run(port=8080, debug=True)
