# backend/websockets/live_visualizer.py

"""
Servidor de WebSockets usando Flask-SocketIO para enviar al frontend
la info de la canción actual en "tiempo real" para el visualizador.

Diseño:
- `socketio` se inicializa con `init_socketio(app)` desde app.py.
- El cliente se conecta y manda su access_token con el evento
  "register_access_token".
- Un hilo de fondo recorre los clientes registrados y les envía
  periódicamente el evento "current_track" con datos actualizados.

Requisitos:
- flask-socketio
- eventlet (o gevent, pero eventlet es lo más sencillo en local)
"""

from __future__ import annotations

import time
from threading import Lock

from flask import request
from flask_socketio import SocketIO, emit, disconnect

from backend.services.spotify_service import SpotifyService

# Instancia sin app; se inicializa luego
socketio = SocketIO(cors_allowed_origins="*")

spotify_service = SpotifyService()

# Diccionario: { session_id: access_token }
connected_clients: dict[str, str] = {}

# Control para el hilo de actualización
_thread = None
_thread_lock = Lock()


def init_socketio(app):
    """
    Llamar desde app.py para inicializar SocketIO con la app Flask:

    from websockets.live_visualizer import socketio, init_socketio
    app = Flask(__name__)
    init_socketio(app)
    """
    global socketio
    socketio.init_app(app, cors_allowed_origins="*")
    return socketio


def _background_worker():
    """
    Hilo de fondo que cada N segundos:
    - Recorre los clientes conectados.
    - Pide al servicio de Spotify la canción actual.
    - Emite un evento 'current_track' a cada cliente.
    """
    print("[live_visualizer] Hilo de fondo iniciado ✅")

    while True:
        # Pequeño delay para no spamear la API (ajusta a tu gusto)
        time.sleep(2)

        if not connected_clients:
            continue

        # Copia local para evitar problemas mientras se itera
        clients_snapshot = dict(connected_clients)

        for sid, access_token in clients_snapshot.items():
            try:
                track_data = spotify_service.get_current_track_with_features(access_token)
                if track_data is None:
                    # Algo falló al consultar Spotify, no emitimos nada
                    continue

                # Emitimos al cliente específico (room=sid)
                socketio.emit(
                    "current_track",
                    track_data,
                    room=sid
                )

            except Exception as e:
                print(f"[live_visualizer] Error actualizando cliente {sid}: {e}")


def _ensure_background_thread():
    global _thread
    with _thread_lock:
        if _thread is None:
            _thread = socketio.start_background_task(_background_worker)


@socketio.on("connect")
def handle_connect():
    """
    Evento cuando un cliente WebSocket se conecta.
    """
    sid = request.sid
    print(f"[live_visualizer] Cliente conectado: {sid}")
    # Lanzamos el hilo de fondo si aún no está corriendo
    _ensure_background_thread()
    emit("connected", {"message": "WebSocket conectado al servidor"})


@socketio.on("disconnect")
def handle_disconnect():
    """
    Evento cuando un cliente se desconecta.
    """
    sid = request.sid
    print(f"[live_visualizer] Cliente desconectado: {sid}")
    connected_clients.pop(sid, None)


@socketio.on("register_access_token")
def handle_register_access_token(data):
    """
    El cliente debe llamar este evento después de conectarse
    mandando algo como:

    socket.emit("register_access_token", { access_token: "..." })

    para que el backend sepa qué token usar para ese cliente.
    """
    sid = request.sid
    access_token = data.get("access_token")

    if not access_token:
        emit("registration_error", {"error": "No access_token provided"})
        disconnect()
        return

    connected_clients[sid] = access_token
    print(f"[live_visualizer] Registrado access_token para {sid}")
    emit("registration_ok", {"success": True})
