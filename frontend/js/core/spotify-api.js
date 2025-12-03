// frontend/js/core/spotify-api.js
(function () {
    "use strict";

    class SpotifyAPIService {
        constructor(config, authManager) {
            this.config = config;
            this.authManager = authManager;
            this.baseUrl = config.apiBaseUrl;
            console.log("[SpotifyAPIService] ✅ Inicializado con baseUrl:", this.baseUrl);
        }

        async _get(endpoint, params = {}) {
            try {
                // Obtener access token del authManager
                let accessToken = null;

                // Intento 1: Usar el método getAccessToken si existe
                if (typeof this.authManager.getAccessToken === 'function') {
                    accessToken = this.authManager.getAccessToken();
                }
                // Intento 2: Buscar directamente en tokens
                else if (this.authManager.tokens && this.authManager.tokens.access_token) {
                    accessToken = this.authManager.tokens.access_token;
                }
                // Intento 3: Buscar en localStorage como último recurso
                else {
                    try {
                        const stored = localStorage.getItem('spotify_tokens_v1');
                        if (stored) {
                            const tokens = JSON.parse(stored);
                            accessToken = tokens.access_token;
                        }
                    } catch (e) {
                        console.warn("[SpotifyAPIService] No se pudo leer tokens de localStorage:", e);
                    }
                }

                if (!accessToken) {
                    console.warn("[SpotifyAPIService] ⚠️ No hay access token disponible");
                    throw new Error("No authenticated");
                }

                const url = new URL(`${this.baseUrl}${endpoint}`);
                Object.keys(params).forEach(key => {
                    if (params[key] !== undefined && params[key] !== null) {
                        url.searchParams.append(key, params[key]);
                    }
                });

                console.log(`[SpotifyAPIService] 📤 GET ${url.toString()}`);

                const response = await fetch(url.toString(), {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    mode: 'cors'
                });

                console.log(`[SpotifyAPIService] 📥 Response ${endpoint}: ${response.status}`);

                if (response.status === 401) {
                    console.warn("[SpotifyAPIService] ⚠️ 401 Unauthorized - token expirado");
                    // Intentar limpiar tokens
                    if (typeof this.authManager.clearTokens === 'function') {
                        this.authManager.clearTokens();
                    } else {
                        localStorage.removeItem('spotify_tokens_v1');
                    }
                    throw new Error("Unauthorized - please reconnect");
                }

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`[SpotifyAPIService] ❌ Error ${response.status}: ${errorText}`);
                    throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 100)}`);
                }

                return await response.json();

            } catch (error) {
                console.error(`[SpotifyAPIService] 💥 Error en _get(${endpoint}):`, error.message);
                throw error;
            }
        }

        async getUserProfile() {
            try {
                console.log("[SpotifyAPIService] 👤 Obteniendo perfil de usuario...");
                const data = await this._get('/api/user-profile');
                console.log("[SpotifyAPIService] ✅ Perfil obtenido");
                return data;
            } catch (error) {
                console.error("[SpotifyAPIService] ❌ Error obteniendo perfil:", error);
                throw error;
            }
        }

        async getCurrentTrack() {
            try {
                console.log("[SpotifyAPIService] 🎵 Obteniendo canción actual...");
                const data = await this._get('/api/current-track');

                if (data && data.item) {
                    console.log(`[SpotifyAPIService] ✅ Now Playing: ${data.item.name}`);
                } else if (data && data.is_playing === false) {
                    console.log("[SpotifyAPIService] ℹ️ No hay canción reproduciéndose");
                }

                return data;
            } catch (error) {
                if (error.message === "No authenticated") {
                    console.warn("[SpotifyAPIService] ⚠️ No autenticado, omitiendo current track");
                    return null;
                }
                console.error("[SpotifyAPIService] ❌ Error obteniendo current track:", error);
                throw error;
            }
        }

        async getTopTracks(timeRange = 'short_term', limit = 10) {
            try {
                console.log(`[SpotifyAPIService] 🎵 Obteniendo top tracks (${timeRange}, ${limit})...`);
                const data = await this._get('/api/top-tracks', {
                    time_range: timeRange,
                    limit: limit
                });
                console.log(`[SpotifyAPIService] ✅ Top tracks obtenidos: ${data?.items?.length || 0} tracks`);
                return data;
            } catch (error) {
                console.error("[SpotifyAPIService] ❌ Error obteniendo top tracks:", error);
                throw error;
            }
        }

        async getTopArtists(timeRange = 'short_term', limit = 10) {
            try {
                console.log(`[SpotifyAPIService] 🎤 Obteniendo top artists (${timeRange}, ${limit})...`);
                const data = await this._get('/api/top-artists', {
                    time_range: timeRange,
                    limit: limit
                });
                console.log(`[SpotifyAPIService] ✅ Top artists obtenidos: ${data?.items?.length || 0} artists`);
                return data;
            } catch (error) {
                console.error("[SpotifyAPIService] ❌ Error obteniendo top artists:", error);
                throw error;
            }
        }

        async getRecentTracks(limit = 20) {
            try {
                console.log(`[SpotifyAPIService] ⏱️ Obteniendo recent tracks (${limit})...`);
                const data = await this._get('/api/recent-tracks', {
                    limit: limit
                });
                console.log(`[SpotifyAPIService] ✅ Recent tracks obtenidos: ${data?.items?.length || 0} tracks`);
                return data;
            } catch (error) {
                console.error("[SpotifyAPIService] ❌ Error obteniendo recent tracks:", error);
                throw error;
            }
        }

        async getStats() {
            try {
                console.log("[SpotifyAPIService] 📊 Obteniendo stats...");
                const data = await this._get('/api/stats');
                console.log("[SpotifyAPIService] ✅ Stats obtenidos");
                return data;
            } catch (error) {
                console.error("[SpotifyAPIService] ❌ Error obteniendo stats:", error);
                throw error;
            }
        }
    }

    window.SpotifyAPIService = SpotifyAPIService;
})();