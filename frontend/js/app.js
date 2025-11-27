// frontend/js/app.js
// Orquestador principal del frontend: auth + API + layout + visualizer

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Iniciando frontend Spotify Visualizer...');

    // ========== Instancias base ==========

    const auth = new window.AuthManager();
    const api = new window.SpotifyAPIService(auth);
    const layout = new window.LayoutManager('app'); // div#app en tu HTML

    // Exponer por si quieres jugar desde consola
    window.authManager = auth;
    window.spotifyAPI = api;
    window.layoutManager = layout;

    // ========== Handlers de login / logout conectados a la UI ==========

    layout.setLoginHandler(() => {
        console.log('🔐 Click en "Conectar con Spotify"');
        auth.login();
    });

    layout.setLogoutHandler(() => {
        console.log('⏏ Cerrando sesión...');
        auth.clearSession();
    });

    // ========== Polling de canción actual ==========

    let currentTrackIntervalId = null;
    const CURRENT_TRACK_POLL_MS = 4000; // puedes ajustar

    async function fetchAndUpdateCurrentTrack() {
        try {
            const token = await auth.getAccessToken();
            if (!token) {
                console.warn('⚠️ Sin token válido para consultar current track');
                stopCurrentTrackPolling();
                return;
            }

            const trackData = await api.getCurrentTrack().catch(err => {
                console.error('Error en getCurrentTrack:', err);
                return null;
            });

            if (!trackData) {
                return;
            }

            // Actualiza tarjeta de "Reproduciendo ahora"
            layout.updateNowPlaying(trackData);
            // Visualizer se actualiza porque layout dispara evento 'layout:now-playing-updated'
        } catch (e) {
            console.error('💥 Error en fetchAndUpdateCurrentTrack:', e);
        }
    }

    function startCurrentTrackPolling() {
        if (currentTrackIntervalId) {
            clearInterval(currentTrackIntervalId);
        }

        console.log('🎧 Iniciando polling de canción actual...');
        // Primer update inmediato
        fetchAndUpdateCurrentTrack();
        currentTrackIntervalId = setInterval(fetchAndUpdateCurrentTrack, CURRENT_TRACK_POLL_MS);
    }

    function stopCurrentTrackPolling() {
        if (currentTrackIntervalId) {
            clearInterval(currentTrackIntervalId);
            currentTrackIntervalId = null;
            console.log('🛑 Polling de canción actual detenido');
        }
    }

    // Cuando se cierre sesión desde cualquier lado
    window.addEventListener('auth:logout', () => {
        stopCurrentTrackPolling();
    });

    // ========== Carga de datos iniciales (top, recientes, stats) ==========

    async function loadInitialData() {
        try {
            const token = await auth.getAccessToken();
            if (!token) {
                console.warn('⚠️ No hay token para cargar datos iniciales');
                return;
            }

            console.log('📊 Cargando datos iniciales (top tracks, recientes, stats)...');

            const [
                topTracks,
                recentTracks,
                stats
            ] = await Promise.all([
                api.getTopTracks('short_term', 10).catch(err => {
                    console.error('Error cargando top tracks:', err);
                    return null;
                }),
                api.getRecentTracks(20).catch(err => {
                    console.error('Error cargando recientes:', err);
                    return null;
                }),
                api.getUserStats().catch(err => {
                    console.error('Error cargando stats:', err);
                    return null;
                })
            ]);

            if (topTracks) {
                layout.updateTopTracks(topTracks);
            }

            if (recentTracks) {
                layout.updateRecentTracks(recentTracks);
            }

            if (stats) {
                layout.updateStats(stats);
            }

            console.log('✅ Datos iniciales cargados');
        } catch (e) {
            console.error('💥 Error en loadInitialData:', e);
        }
    }

    // ========== Controles del visualizer (Partículas / Spectrum) ==========

    function setupVisualizerControls() {
        const { createButton } = window.UIComponents || {};
        if (!createButton) return;

        const visualizerSection = document.getElementById('visualizer-section');
        if (!visualizerSection) return;

        const controls = document.createElement('div');
        controls.className = 'visualizer-controls';

        const title = document.createElement('span');
        title.className = 'visualizer-controls__label';
        title.textContent = 'Modo visual:';

        const btnParticles = createButton({
            label: 'Partículas',
            icon: '🌌',
            variant: 'ghost',
            size: 'sm',
            onClick: () => {
                if (window.visualizerManager) {
                    window.visualizerManager.setEffect('particles');
                }
                highlightButton(btnParticles, btnSpectrum);
            }
        });

        const btnSpectrum = createButton({
            label: 'Spectrum',
            icon: '📶',
            variant: 'ghost',
            size: 'sm',
            onClick: () => {
                if (window.visualizerManager) {
                    window.visualizerManager.setEffect('spectrum');
                }
                highlightButton(btnSpectrum, btnParticles);
            }
        });

        function highlightButton(active, other) {
            active.classList.add('visualizer-controls__btn--active');
            other.classList.remove('visualizer-controls__btn--active');
        }

        // Estado inicial: partículas
        highlightButton(btnParticles, btnSpectrum);

        const btnWrapper = document.createElement('div');
        btnWrapper.className = 'visualizer-controls__buttons';
        btnWrapper.appendChild(btnParticles);
        btnWrapper.appendChild(btnSpectrum);

        controls.appendChild(title);
        controls.appendChild(btnWrapper);

        // Insertamos controles justo debajo del título de la sección del visualizer
        const header = visualizerSection.querySelector('.ui-section-title');
        if (header && header.parentNode) {
            header.parentNode.insertBefore(controls, header.nextSibling);
        } else {
            visualizerSection.insertBefore(controls, visualizerSection.firstChild);
        }
    }

    setupVisualizerControls();

    // ========== Flujo de inicio: callback + sesión existente ==========

    async function initAuthFlow() {
        try {
            // 1) Ver si venimos de /callback?code=...
            const callbackHandled = await auth.handleAuthCallbackFromURL();

            // 2) Si no hubo callback, ver si hay sesión guardada
            let hasSession = callbackHandled;
            if (!hasSession) {
                hasSession = auth.checkExistingSession();
            }

            if (!hasSession) {
                console.log('ℹ️ No hay sesión activa todavía');
                layout.setLoggedInState(false);
                return;
            }

            layout.setLoggedInState(true);

            // 3) Asegurar perfil de usuario
            const user = await auth.fetchUserProfile();
            if (user) {
                layout.setUser(user);
            }

            // 4) Cargar datos iniciales
            await loadInitialData();

            // 5) Empezar polling de canción actual
            startCurrentTrackPolling();

        } catch (e) {
            console.error('💥 Error en initAuthFlow:', e);
        }
    }

    initAuthFlow();
});
