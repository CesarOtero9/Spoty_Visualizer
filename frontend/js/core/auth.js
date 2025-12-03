// frontend/js/core/auth.js
(function () {
    "use strict";

    class AuthManager {
        constructor(config) {
            // Asegurar que tenemos config
            if (!config) {
                console.warn("[AuthManager] No se pasó config, usando window.AppConfig");
                config = window.AppConfig;
            }

            if (!config || !config.apiBaseUrl) {
                console.error("[AuthManager] ERROR: No hay configuración válida");
                throw new Error("AuthManager requiere configuración con apiBaseUrl");
            }

            this.config = config;
            this.storageKey = 'spotify_tokens_v1';
            this.tokens = this._loadTokens();
            console.log("[AuthManager] ✅ Inicializado. API Base:", this.config.apiBaseUrl);
        }

        _loadTokens() {
            try {
                const raw = localStorage.getItem(this.storageKey);
                if (!raw) return null;
                const data = JSON.parse(raw);
                return data;
            } catch (e) {
                console.warn("[AuthManager] No se pudieron cargar tokens:", e);
                return null;
            }
        }

        _saveTokens(tokens) {
            this.tokens = tokens;
            try {
                localStorage.setItem(this.storageKey, JSON.stringify(tokens));
            } catch (e) {
                console.warn("[AuthManager] No se pudieron guardar tokens:", e);
            }
        }

        clearTokens() {
            this.tokens = null;
            localStorage.removeItem(this.storageKey);
            console.log("[AuthManager] 🗑️ Tokens limpiados");
        }


        isAuthenticated() {
            return !!(this.tokens && this.tokens.access_token);
        }

        getAccessToken() {
            if (this.tokens && this.tokens.access_token) {
                return this.tokens.access_token;
            }
            return null;
        }

        getTokens() {
            return this.tokens ? { ...this.tokens } : null;
        }

        initFromUrl() {
            const url = new URL(window.location.href);
            const accessToken = url.searchParams.get('access_token');
            const refreshToken = url.searchParams.get('refresh_token');
            const expiresIn = url.searchParams.get('expires_in');

            if (accessToken) {
                this._saveTokens({
                    access_token: accessToken,
                    refresh_token: refreshToken || null,
                    expires_in: expiresIn ? Number(expiresIn) : null,
                    created_at: Date.now()
                });

                // Limpiar la URL
                url.searchParams.delete('access_token');
                url.searchParams.delete('refresh_token');
                url.searchParams.delete('expires_in');
                window.history.replaceState({}, document.title, url.toString());

                console.log("[AuthManager] ✅ Tokens guardados desde la URL");
            }
        }

        async startLogin() {
            try {
                const loginUrl = `${this.config.apiBaseUrl}/auth/login`;
                console.log("[AuthManager] 🔗 Solicitando URL de login a:", loginUrl);

                const response = await fetch(loginUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                    },
                    mode: 'cors'
                });

                console.log("[AuthManager] 📥 Respuesta recibida. Status:", response.status);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error("[AuthManager] ❌ Error en /auth/login:", response.status, errorText);
                    alert(`Error ${response.status}: No se pudo conectar con el backend. Verifica que el servidor esté corriendo en ${this.config.apiBaseUrl}`);
                    return;
                }

                const data = await response.json();
                console.log("[AuthManager] 📋 Datos recibidos:", data);

                if (data.auth_url) {
                    console.log("[AuthManager] ✅ URL de Spotify obtenida, abriendo ventana popup...");

                    // Configurar popup
                    const width = 500;
                    const height = 700;
                    const left = (window.screen.width - width) / 2;
                    const top = (window.screen.height - height) / 2;

                    const popup = window.open(
                        data.auth_url,
                        'spotify_auth',
                        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,status=no`
                    );

                    if (!popup) {
                        alert("⚠️ Por favor, permite ventanas emergentes para autenticarte con Spotify.");
                        return;
                    }

                    // Escuchar mensaje del popup cuando termine la autenticación
                    this._setupPopupListener(popup);

                } else {
                    console.error("[AuthManager] ❌ No se recibió auth_url en la respuesta:", data);
                    alert("Error: El backend no devolvió una URL de autenticación válida");
                }
            } catch (error) {
                console.error("[AuthManager] 💥 Excepción en startLogin:", error);
                alert(`Error de conexión: ${error.message}. Verifica que el backend esté corriendo en ${this.config.apiBaseUrl}`);
            }
        }

        _setupPopupListener(popup) {
            // Escuchar mensaje del popup
            const messageHandler = (event) => {
                // Verificar origen del mensaje para seguridad
                if (event.origin !== 'http://127.0.0.1:8080' &&
                    event.origin !== 'http://localhost:8080' &&
                    !event.origin.includes('127.0.0.1')) {
                    console.warn("[AuthManager] ⚠️ Mensaje de origen no permitido:", event.origin);
                    return;
                }

                if (event.data.type === 'spotify-auth-callback') {
                    console.log("[AuthManager] ✅ Callback recibido del popup:", event.data.data);

                    // Remover el event listener
                    window.removeEventListener('message', messageHandler);

                    // Procesar los datos de autenticación
                    this._handleAuthCallback(event.data.data);

                    // Intentar cerrar el popup si sigue abierto
                    if (popup && !popup.closed) {
                        popup.close();
                    }
                }
            };

            window.addEventListener('message', messageHandler);

            // También verificar periódicamente si el popup se cerró manualmente
            const checkPopup = setInterval(() => {
                if (popup.closed) {
                    console.log("[AuthManager] 👋 Popup cerrado por el usuario");
                    clearInterval(checkPopup);
                    window.removeEventListener('message', messageHandler);
                }
            }, 1000);

            // Limpiar después de 5 minutos por seguridad
            setTimeout(() => {
                clearInterval(checkPopup);
                window.removeEventListener('message', messageHandler);
                if (popup && !popup.closed) {
                    popup.close();
                }
            }, 5 * 60 * 1000);
        }

        _handleAuthCallback(authData) {
            if (authData.success && authData.access_token) {
                console.log("[AuthManager] 🎉 Autenticación exitosa!");

                // Guardar tokens
                this._saveTokens({
                    access_token: authData.access_token,
                    refresh_token: authData.refresh_token || null,
                    expires_in: authData.expires_in || null,
                    created_at: Date.now()
                });

                // Actualizar UI
                this._updateUIAfterAuth(authData.user);

                // Disparar evento global para que app.js sepa
                window.dispatchEvent(new CustomEvent('spotify-auth-success', {
                    detail: {
                        user: authData.user,
                        tokens: {
                            access_token: authData.access_token,
                            refresh_token: authData.refresh_token
                        }
                    }
                }));

                // Mostrar notificación
                this._showSuccessNotification(authData.user);

            } else {
                console.error("[AuthManager] ❌ Error en callback:", authData);
                alert("Error en la autenticación: " + (authData.error || "Desconocido"));
            }
        }

        _updateUIAfterAuth(user) {
            // Actualizar botón de conexión
            const connectBtn = document.getElementById("connect-btn");
            if (connectBtn) {
                connectBtn.innerHTML = '<span class="ui-btn__label">Conectado</span><span class="ui-icon">✓</span>';
                connectBtn.classList.add("ui-btn--primary");
                connectBtn.disabled = true;
            }

            // Actualizar nombre de perfil
            const profileName = document.getElementById("profile-name");
            if (profileName && user) {
                profileName.textContent = user.name || "Usuario";
            }

            // Actualizar imagen de perfil
            const profileImage = document.getElementById("profile-image");
            if (profileImage && user && user.avatar) {
                profileImage.src = user.avatar;
                profileImage.onerror = function() {
                    this.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%231DB954'/%3E%3Ctext x='50' y='55' text-anchor='middle' fill='white' font-size='40'%3E♪%3C/text%3E%3C/svg%3E";
                };
            }

            // Actualizar mini perfil en header
            const miniProfileName = document.getElementById("mini-profile-name");
            const miniProfileImage = document.getElementById("mini-profile-image");

            if (miniProfileName && user) {
                miniProfileName.textContent = user.name || "Usuario";
            }

            if (miniProfileImage && user && user.avatar) {
                miniProfileImage.style.backgroundImage = `url(${user.avatar})`;
                miniProfileImage.style.backgroundSize = 'cover';
                miniProfileImage.textContent = '';
            }

            // Actualizar estado de conexión
            const connectionStatus = document.getElementById("connection-status");
            if (connectionStatus) {
                connectionStatus.textContent = "Conectado ✓";
                connectionStatus.style.color = "#10b981";
            }
        }

        _showSuccessNotification(user) {
            // Crear notificación toast
            const toast = document.createElement('div');
            toast.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #10b981;
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                z-index: 9999;
                animation: slideIn 0.3s ease;
                display: flex;
                align-items: center;
                gap: 10px;
            `;

            toast.innerHTML = `
                <span style="font-size: 20px;">✅</span>
                <div>
                    <strong>¡Conectado a Spotify!</strong>
                    <div style="font-size: 14px; opacity: 0.9;">Hola, ${user?.name || 'Usuario'}!</div>
                </div>
            `;

            document.body.appendChild(toast);

            // Auto-remover después de 5 segundos
            setTimeout(() => {
                toast.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }, 5000);

            // Añadir animación CSS
            const style = document.createElement('style');
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    window.AuthManager = AuthManager;
})();