/// frontend/js/core/auth.js
// Manejo de OAuth con tu backend Flask

(function () {
    class AuthManager {
        constructor() {
            this.storageKey = 'spotify_visualizer_session';
            this.tokens = null;
            this.user = null;

            // 🔒 Evitar procesar el callback más de una vez
            this._callbackHandled = false;

            const defaultBaseUrl = 'http://127.0.0.1:8080';
            const meta = document.querySelector('meta[name="api-base-url"]');
            this.baseUrl = meta?.content || defaultBaseUrl;

            this._loadSession();
        }

        // ======= Storage =======

        _loadSession() {
            try {
                const raw = localStorage.getItem(this.storageKey);
                if (!raw) return;
                const data = JSON.parse(raw);

                this.tokens = data.tokens || null;
                this.user = data.user || null;
            } catch (e) {
                console.warn('[AuthManager] Error leyendo sesión:', e);
            }
        }

        _saveSession() {
            try {
                const data = {
                    tokens: this.tokens,
                    user: this.user
                };
                localStorage.setItem(this.storageKey, JSON.stringify(data));
            } catch (e) {
                console.warn('[AuthManager] Error guardando sesión:', e);
            }
        }

        clearSession() {
            this.tokens = null;
            this.user = null;
            localStorage.removeItem(this.storageKey);
            window.dispatchEvent(new Event('auth:logout'));
        }

        // ======= Login =======

        async login() {
            try {
                const res = await fetch(`${this.baseUrl}/auth/login`);
                if (!res.ok) {
                    throw new Error(`Error ${res.status} en /auth/login`);
                }
                const data = await res.json();
                if (data.auth_url) {
                    window.location.href = data.auth_url;
                } else {
                    console.error('[AuthManager] Respuesta inesperada de /auth/login', data);
                }
            } catch (e) {
                console.error('[AuthManager] Error en login:', e);
            }
        }

        /**
         * Maneja el callback de Spotify:
         *   http://127.0.0.1:3000/public/index.html?code=...
         *
         * Devuelve true si procesó un code válido, false si no había code.
         */
        async handleAuthCallbackFromURL() {
            const url = new URL(window.location.href);
            const code = url.searchParams.get('code');
            const error = url.searchParams.get('error');

            if (!code && !error) {
                // Nada que procesar
                return false;
            }

            // Evitar que se dispare dos veces (que es justo lo que está pasando)
            if (this._callbackHandled) {
                console.warn('[AuthManager] Callback ya procesado, ignorando duplicado');
                return false;
            }
            this._callbackHandled = true;

            if (error) {
                console.error('[AuthManager] Error en callback de Spotify:', error);
                return false;
            }

            try {
                const res = await fetch(
                    `${this.baseUrl}/callback?code=${encodeURIComponent(code)}`
                );
                const data = await res.json();

                if (!res.ok || !data.success) {
                    console.error('[AuthManager] Error en /callback:', data);
                    return false;
                }

                this.tokens = {
                    access_token: data.access_token,
                    refresh_token: data.refresh_token,
                    expires_in: data.expires_in,
                    token_type: data.token_type,
                    created_at: Date.now()
                };

                this.user = data.user || null;
                this._saveSession();

                // Limpiar el code de la URL
                url.searchParams.delete('code');
                url.searchParams.delete('error');
                window.history.replaceState({}, document.title, url.toString());

                window.dispatchEvent(new CustomEvent('auth:login', {
                    detail: { user: this.user }
                }));

                return true;
            } catch (e) {
                console.error('[AuthManager] Error procesando callback:', e);
                return false;
            }
        }

        checkExistingSession() {
            return !!(this.tokens && this.tokens.access_token);
        }

        async getAccessToken() {
            if (!this.tokens) return null;
            return this.tokens.access_token;
        }

        async fetchUserProfile() {
            if (!this.tokens) return null;

            try {
                const res = await fetch(`${this.baseUrl}/api/user-profile`, {
                    headers: {
                        Authorization: `Bearer ${this.tokens.access_token}`
                    }
                });

                if (!res.ok) {
                    console.warn('[AuthManager] No se pudo obtener perfil:', res.status);
                    return null;
                }

                const data = await res.json();
                this.user = {
                    id: data.id,
                    name: data.display_name || data.id,
                    email: data.email,
                    avatar: data.images?.[0]?.url || null
                };
                this._saveSession();

                window.dispatchEvent(new CustomEvent('auth:user-updated', {
                    detail: { user: this.user }
                }));

                return this.user;
            } catch (e) {
                console.error('[AuthManager] Error al pedir perfil:', e);
                return null;
            }
        }
    }

    window.AuthManager = AuthManager;
})();
