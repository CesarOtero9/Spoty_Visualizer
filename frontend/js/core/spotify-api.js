// frontend/js/core/spotify-api.js
// Capa de servicio para llamar a tu backend Flask

(function () {
    class SpotifyAPIService {
        constructor(authManager) {
            this.authManager = authManager;

            const defaultBaseUrl = 'http://127.0.0.1:8080';

            // Permite override vía <meta name="api-base-url">
            const meta = document.querySelector('meta[name="api-base-url"]');
            this.baseUrl = meta?.content || defaultBaseUrl;
        }

        // Helper genérico
        async _get(path, params = {}) {
            const token = await this.authManager.getAccessToken();
            if (!token) {
                throw new Error('No hay token de acceso');
            }

            const url = new URL(this.baseUrl + path);
            Object.entries(params).forEach(([k, v]) => {
                if (v !== undefined && v !== null) {
                    url.searchParams.set(k, v);
                }
            });

            const res = await fetch(url.toString(), {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!res.ok) {
                const text = await res.text().catch(() => '');
                throw new Error(`Error ${res.status} en ${path}: ${text}`);
            }

            return res.json();
        }

        // ========== Métodos públicos ==========

        getUserProfile() {
            return this._get('/api/user-profile');
        }

        getCurrentTrack() {
            return this._get('/api/current-track');
        }

        getTopTracks(timeRange = 'short_term', limit = 10) {
            return this._get('/api/top-tracks', {
                time_range: timeRange,
                limit
            });
        }

        getTopArtists(timeRange = 'short_term', limit = 10) {
            return this._get('/api/top-artists', {
                time_range: timeRange,
                limit
            });
        }

        getRecentTracks(limit = 20) {
            return this._get('/api/recent-tracks', { limit });
        }

        getUserStats() {
            return this._get('/api/stats');
        }
    }

    // Exportar de forma segura
    window.SpotifyAPIService = SpotifyAPIService;
})();
