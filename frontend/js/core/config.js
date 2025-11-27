// frontend/js/core/config.js
// Configuración global de la aplicación

(function () {
    const DEFAULT_API_BASE = 'http://127.0.0.1:8080';

    // Permite sobreescribir el backend con una meta tag si algún día lo sacas a producción:
    // <meta name="api-base-url" content="https://mi-backend.com">
    function detectApiBaseURL() {
        try {
            const meta = document.querySelector('meta[name="api-base-url"]');
            if (meta && meta.content) return meta.content.trim();
        } catch (e) {
            console.warn('No se pudo leer meta api-base-url:', e);
        }
        return DEFAULT_API_BASE;
    }

    const apiBaseURL = detectApiBaseURL();

    window.AppConfig = {
        visualizer: {
            effects: ['particles', 'waves', 'bars', 'circular'],
            defaultEffect: 'particles',
            nodeCount: 80,
            connectionDistance: 150
        },
        spotify: {
            // Esto es informativo, el backend es quien realmente pide estos scopes
            scopes: [
                'user-read-currently-playing',
                'user-read-playback-state',
                'user-top-read',
                'user-read-recently-played',
                'user-library-read',
                'user-read-email',
                'user-read-private'
            ].join(' ')
        },
        api: {
            baseURL: apiBaseURL,
            timeout: 10000
        },
        auth: {
            storageKeys: {
                accessToken: 'spotify_access_token',
                refreshToken: 'spotify_refresh_token',
                tokenExpiry: 'spotify_token_expiry'
            },
            // margen para considerar un token "casi expirado" (segundos)
            expiryLeewaySeconds: 60
        }
    };

    console.log('🌐 AppConfig inicializado:', window.AppConfig);
})();
