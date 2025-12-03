// frontend/js/app.js
(function () {
    "use strict";

    console.log("🚀 Spotify Visualizer iniciando...");

    // Función principal de inicialización
    function initializeApplication() {
        console.log("🔄 Inicializando aplicación...");

        // 1. Verificar que AppConfig existe
        if (!window.AppConfig) {
            console.error("❌ ERROR: window.AppConfig NO EXISTE - creando configuración de emergencia");
            window.AppConfig = {
                apiBaseUrl: 'http://127.0.0.1:8080',
                pollingIntervalMs: 4000,
                statsIntervalMs: 30000,
                visualizer: { defaultMode: 'particles', maxFPS: 60 },
                createdInApp: true
            };
            console.log("🆘 AppConfig creado en app.js:", window.AppConfig);
        }

        // Verificar apiBaseUrl
        if (!window.AppConfig.apiBaseUrl) {
            console.warn("⚠️ apiBaseUrl no definido, asignando valor por defecto");
            window.AppConfig.apiBaseUrl = 'http://127.0.0.1:8080';
        }

        const config = window.AppConfig;
        console.log("📋 Configuración a usar:", config);

        // 2. Verificar dependencias críticas
        const missingDeps = [];
        if (!window.LayoutManager) missingDeps.push('LayoutManager');
        if (!window.AuthManager) missingDeps.push('AuthManager');

        if (missingDeps.length > 0) {
            console.error("❌ Dependencias faltantes:", missingDeps);
            showError("Faltan componentes: " + missingDeps.join(', '));
            return;
        }

        // 3. Inicializar componentes principales
        let layout, auth, api;
        try {
            layout = new LayoutManager();
            console.log("✅ LayoutManager inicializado");

            auth = new AuthManager(config);
            console.log("✅ AuthManager inicializado");

            // DEBUG: Verificar que auth tiene los métodos necesarios
            console.log("🔍 Verificación auth:");
            console.log(" - auth.getAccessToken existe?:", typeof auth.getAccessToken);
            console.log(" - auth.getAccessToken es función?:", typeof auth.getAccessToken === 'function');
            console.log(" - auth.tokens:", auth.tokens);

            // Inicializar API si está disponible
            if (window.SpotifyAPIService) {
                api = new SpotifyAPIService(config, auth);
                console.log("✅ SpotifyAPIService inicializado");
            } else {
                console.warn("⚠️ SpotifyAPIService no está disponible");
            }

        } catch (error) {
            console.error("💥 Error inicializando componentes:", error);
            showError("Error inicializando: " + error.message);
            return;
        }

        // 4. Configurar UI
        setupUI(auth);

        // 5. Escuchar evento de autenticación exitosa
        window.addEventListener('spotify-auth-success', function(event) {
            console.log("🎉 Evento de autenticación recibido:", event.detail);
            handleAuthSuccess(auth, api, layout, event.detail);
        });

        // 6. Inicializar canvas
        layout.initializeCanvas();

        // 7. Inicializar visualizador cuando esté listo
        function initializeVisualizerAfterLoad() {
            console.log("🔄 Intentando inicializar visualizador...");

            // Verificar que todos los componentes estén cargados
            if (!window.VisualizerManager) {
                console.warn("⚠️ VisualizerManager no disponible, reintentando en 500ms...");
                setTimeout(initializeVisualizerAfterLoad, 500);
                return;
            }

            if (!window.ColorSync) {
                console.warn("⚠️ ColorSync no disponible, reintentando en 500ms...");
                setTimeout(initializeVisualizerAfterLoad, 500);
                return;
            }

            console.log("✅ Todos los componentes del visualizador están cargados");

            // Inicializar visualizador inmediatamente
            initVisualizer(layout);

            // También configurar el listener por si acaso
            layout.on("canvas-ready", function() {
                console.log("🎨 Canvas ready (evento disparado)");
                initVisualizer(layout);
            });

            // Disparar el evento manualmente
            layout.trigger("canvas-ready");
        }

        // Llamar después de un breve delay
        setTimeout(initializeVisualizerAfterLoad, 1000);

        // 8. Cargar datos iniciales si está autenticado
        if (auth.isAuthenticated()) {
            console.log("👤 Usuario ya autenticado");
            loadInitialData(auth, api, layout);
        } else {
            console.log("🔓 No autenticado - listo para conectar");
            updateUIForUnauthenticated(layout);
        }

        // 9. Iniciar polling si hay API
        if (api) {
            startDataPolling(auth, api, layout);
        }

        console.log("🎉 Aplicación inicializada CORRECTAMENTE");
    }

    function setupUI(auth) {
        console.log("⚙️ Configurando UI...");

        // Botón de conexión
        const connectBtn = document.getElementById("connect-btn");
        if (connectBtn) {
            console.log("🔗 Botón encontrado, configurando...");
            connectBtn.addEventListener("click", function() {
                console.log("🖱️ Click en Conectar Spotify");
                auth.startLogin();
            });

            if (auth.isAuthenticated()) {
                connectBtn.innerHTML = '<span class="ui-btn__label">Conectado</span><span class="ui-icon">✓</span>';
                connectBtn.classList.add("ui-btn--primary");
                connectBtn.disabled = true;
            }
        } else {
            console.warn("⚠️ Botón #connect-btn no encontrado");
        }

        // Botones de modo visualizer
        const modeButtons = document.querySelectorAll("[data-visualizer-mode]");
        modeButtons.forEach(function(btn) {
            btn.addEventListener("click", function() {
                const mode = this.getAttribute("data-visualizer-mode");
                console.log("🎛️ Cambiando a modo:", mode);
                if (window.currentVisualizer && window.currentVisualizer.setMode) {
                    window.currentVisualizer.setMode(mode);
                }
            });
        });
    }

    function initVisualizer(layout) {
        console.log("🎨 Inicializando visualizador...");

        const canvasContainer = document.getElementById("visualizerContainer");
        if (!canvasContainer) {
            console.error("❌ No encontré #visualizerContainer");
            return;
        }

        console.log("🔍 Verificando dependencias:");
        console.log(" - window.ColorSync:", window.ColorSync ? "✅" : "❌");
        console.log(" - window.ParticlesVisualizer:", window.ParticlesVisualizer ? "✅" : "❌");
        console.log(" - window.SpectrumVisualizer:", window.SpectrumVisualizer ? "✅" : "❌");
        console.log(" - window.VisualizerManager:", window.VisualizerManager ? "✅" : "❌");

        // Verificar que todas las dependencias estén cargadas
        if (!window.ColorSync) {
            console.error("❌ ERROR: window.ColorSync no está definido");
            console.error("   Verifica que el archivo color-sync.js se cargue correctamente");
            return;
        }

        if (!window.ParticlesVisualizer) {
            console.error("❌ ERROR: window.ParticlesVisualizer no está definido");
            return;
        }

        if (!window.SpectrumVisualizer) {
            console.error("❌ ERROR: window.SpectrumVisualizer no está definido");
            return;
        }

        if (!window.VisualizerManager) {
            console.error("❌ ERROR: window.VisualizerManager no está definido");
            return;
        }

        // Eliminar canvas existente si hay
        const existingCanvas = document.getElementById("audioVisualizer");
        if (existingCanvas) {
            console.log("🗑️ Eliminando canvas existente");
            existingCanvas.remove();
        }

        // Crear nuevo canvas
        const canvas = document.createElement("canvas");
        canvas.id = "audioVisualizer";
        canvas.className = "visualizer-canvas";
        canvas.width = canvasContainer.clientWidth || 800;
        canvas.height = canvasContainer.clientHeight || 400;
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvasContainer.appendChild(canvas);

        console.log("✅ Canvas creado:", {
            width: canvas.width,
            height: canvas.height,
            containerWidth: canvasContainer.clientWidth,
            containerHeight: canvasContainer.clientHeight
        });

        try {
            console.log("🔄 Creando instancias...");

            // 1. Crear ColorSync
            const colorSync = new window.ColorSync();
            console.log("✅ ColorSync creado");

            // 2. Crear VisualizerManager
            const visualizer = new window.VisualizerManager(canvas, colorSync);
            console.log("✅ VisualizerManager creado");
            console.log("🔍 Métodos disponibles en visualizer:", Object.keys(visualizer));
            console.log("🔍 Tiene updateTrackState?:", typeof visualizer.updateTrackState === 'function' ? "✅" : "❌");

            // 3. Guardar referencia global
            window.currentVisualizer = visualizer;
            console.log("✅ currentVisualizer guardado en window");

            // 4. Crear palette inicial
            const idlePalette = colorSync.getPalette(
                { energy: 0.3, danceability: 0.3, valence: 0.5, tempo: 80 },
                180000
            );
            console.log("✅ Palette inicial creada:", idlePalette);

            // 5. Estado inicial del visualizador
            const initialState = {
                audioFeatures: {
                    energy: 0.3,
                    danceability: 0.3,
                    valence: 0.5,
                    tempo: 80,
                    acousticness: 0.5,
                    loudness: -20,
                    instrumentalness: 0,
                    speechiness: 0.1,
                    liveness: 0.2,
                    key: 0,
                    mode: 1,
                    time_signature: 4
                },
                durationMs: 180000,
                progressMs: 0,
                isPlaying: false,
                palette: idlePalette
            };

            // 6. Aplicar estado inicial
            if (visualizer.updateTrackState) {
                console.log("🔄 Aplicando estado inicial al visualizador...");
                visualizer.updateTrackState(initialState);
                console.log("✅ Estado inicial aplicado");
            } else {
                console.error("❌ visualizer.updateTrackState no es una función");
                console.error("   visualizer object:", visualizer);
            }

            // 7. Aplicar palette al contenedor
            if (colorSync.applyPaletteToCanvas) {
                console.log("🎨 Aplicando palette al contenedor...");
                colorSync.applyPaletteToCanvas(canvasContainer, idlePalette);
                console.log("✅ Palette aplicada al contenedor");
            }

            console.log("🎉 Visualizador inicializado CORRECTAMENTE");

        } catch (error) {
            console.error("💥 Error crítico inicializando visualizador:", error);
            console.error("Stack trace:", error.stack);

            // Mostrar error visual
            canvasContainer.innerHTML = `
                <div style="color: #ef4444; text-align: center; padding: 50px; background: rgba(239, 68, 68, 0.1); border-radius: 10px;">
                    <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                    <h3>Error en el visualizador</h3>
                    <p style="font-family: monospace; background: #1f2937; padding: 10px; border-radius: 5px;">
                        ${error.message}
                    </p>
                    <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #ef4444; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        Recargar página
                    </button>
                </div>
            `;
        }
    }

    async function loadInitialData(auth, api, layout) {
        if (!api) return;

        console.log("📥 Cargando datos iniciales del usuario...");

        try {
            // 1. Perfil del usuario
            const profile = await api.getUserProfile();
            if (profile) {
                layout.updateUserProfile(profile);
                console.log("👤 Perfil cargado:", profile.display_name);
            }

            // 2. Top artists
            const artists = await api.getTopArtists("short_term", 10);
            if (artists && artists.items) {
                layout.updateTopArtists(artists.items);
                console.log("🎤 Top artists cargados:", artists.items.length);
            }

            // 3. Top tracks
            const tracks = await api.getTopTracks("short_term", 10);
            if (tracks && tracks.items) {
                layout.updateTopTracks(tracks.items);
                console.log("🎵 Top tracks cargados:", tracks.items.length);
            }

            // 4. Recent tracks
            const recent = await api.getRecentTracks(10);
            if (recent && recent.items) {
                layout.updateRecentTracks(recent.items);
                console.log("⏱️ Recent tracks cargados:", recent.items.length);
            }

            // 5. Current track
            const currentTrack = await api.getCurrentTrack();
            if (currentTrack && currentTrack.item) {
                console.log("▶️ Now Playing:", currentTrack.item.name);
            }

        } catch (error) {
            console.warn("⚠️ Error cargando datos iniciales:", error);
        }
    }

    function handleAuthSuccess(auth, api, layout, authData) {
        console.log("🔑 Procesando autenticación exitosa...");

        // Actualizar UI inmediatamente
        updateUIAfterAuth(authData.user);

        // Cargar datos del usuario
        if (api) {
            loadInitialData(auth, api, layout);
        }
    }

    function updateUIAfterAuth(user) {
        console.log("🎨 Actualizando UI después de autenticación...");

        // Actualizar mini perfil en header
        const miniName = document.getElementById("mini-profile-name");
        const miniImage = document.getElementById("mini-profile-image");

        if (miniName && user) {
            miniName.textContent = user.name || "Usuario";
        }

        if (miniImage && user && user.avatar) {
            miniImage.style.backgroundImage = "url(" + user.avatar + ")";
            miniImage.style.backgroundSize = "cover";
            miniImage.textContent = "";
        }

        // Actualizar estado de conexión
        const connectionStatus = document.getElementById("connection-status");
        if (connectionStatus) {
            connectionStatus.textContent = "Conectado ✓";
            connectionStatus.style.color = "#10b981";
        }
    }

    function updateUIForUnauthenticated(layout) {
        console.log("🎭 Actualizando UI para no autenticados");

        // Mensajes en listas vacías
        const containers = ["top-artists-list", "top-tracks-list", "recent-tracks-list"];
        containers.forEach(function(id) {
            const container = document.getElementById(id);
            if (container && container.innerHTML.trim() === "") {
                container.innerHTML = '<div style="text-align: center; padding: 20px; color: #9ca3af; font-style: italic; background: rgba(15, 23, 42, 0.5); border-radius: 8px; margin: 10px 0;">Conecta Spotify para ver tu contenido</div>';
            }
        });
    }

    function startDataPolling(auth, api, layout) {
        console.log("🔄 Iniciando polling de datos...");

        let isPolling = false;
        let pollInterval;
        let errorCount = 0;
        const MAX_ERRORS = 3;

        async function pollData() {
            const isAuthenticated = auth.isAuthenticated();

            if (!isAuthenticated || isPolling) return;

            isPolling = true;
            try {
                console.log("🔄 [POLL] Obteniendo canción actual...");
                const currentTrack = await api.getCurrentTrack();

                console.log("🔍 [DEBUG] Datos COMPLETOS recibidos:", currentTrack);

                // Si no hay canción reproduciéndose
                if (!currentTrack || currentTrack.is_playing === false) {
                    console.log("⏸️ No hay canción reproduciéndose");

                    // Si hay visualizador, poner en estado de espera
                    if (window.currentVisualizer) {
                        console.log("🎨 Configurando visualizador en estado idle");
                        const idleState = {
                            audioFeatures: {
                                energy: 0.3,
                                danceability: 0.3,
                                valence: 0.5,
                                tempo: 80,
                                acousticness: 0.5,
                                loudness: -20,
                                instrumentalness: 0,
                                speechiness: 0.1,
                                liveness: 0.2,
                                key: 0,
                                mode: 1,
                                time_signature: 4
                            },
                            durationMs: 180000,
                            progressMs: 0,
                            isPlaying: false,
                            palette: {
                                mood: 'idle',
                                primary: '#374151',
                                secondary: '#6b7280',
                                accent: '#9ca3af',
                                bgGradient: ['#020617', '#020617', '#020617']
                            }
                        };
                        window.currentVisualizer.updateTrackState(idleState);
                    }

                    // Mostrar mensaje en UI
                    updateNowPlayingUI({
                        is_playing: false,
                        item: {
                            name: "No hay canción reproduciéndose",
                            artists: [{name: "Reproduce música en Spotify"}],
                            album: { images: [] }
                        }
                    });

                    return;
                }

                // SI HAY CANCIÓN REPRODUCIÉNDOSE
                console.log("🎵 Canción encontrada:", currentTrack.item.name);
                console.log("🔊 Audio features disponibles:", currentTrack.audio_features ? "SÍ" : "NO");
                console.log("🎨 Visualizer data disponible:", currentTrack.visualizer ? "SÍ" : "NO");

                // Actualizar UI inmediatamente
                updateNowPlayingUI(currentTrack);

                // Pasar datos al visualizador si existe
                if (window.currentVisualizer && currentVisualizer.updateTrackState) {
                    console.log("🔄 Pasando datos al visualizador...");

                    // Extraer audio features
                    const audioFeatures = currentTrack.audio_features || currentTrack.visualizer || {};
                    console.log("📊 Audio features extraídas:", audioFeatures);

                    // Crear estado para visualizador
                    const visualizerState = {
                        audioFeatures: {
                            energy: audioFeatures.energy || 0.5,
                            danceability: audioFeatures.danceability || 0.5,
                            valence: audioFeatures.valence || 0.5,
                            tempo: audioFeatures.tempo || 120,
                            acousticness: audioFeatures.acousticness || 0.5,
                            loudness: audioFeatures.loudness || -10,
                            instrumentalness: audioFeatures.instrumentalness || 0,
                            speechiness: audioFeatures.speechiness || 0.1,
                            liveness: audioFeatures.liveness || 0.2,
                            key: audioFeatures.key || 0,
                            mode: audioFeatures.mode || 1,
                            time_signature: audioFeatures.time_signature || 4
                        },
                        durationMs: currentTrack.item.duration_ms || 0,
                        progressMs: currentTrack.progress_ms || 0,
                        isPlaying: currentTrack.is_playing || false
                    };

                    // Generar palette de colores
                    if (window.ColorSync) {
                        console.log("🎨 Generando palette de colores...");
                        const colorSync = new window.ColorSync();
                        const palette = colorSync.getPalette(
                            visualizerState.audioFeatures,
                            visualizerState.durationMs
                        );
                        visualizerState.palette = palette;
                        console.log("🌈 Palette generada:", palette);
                    }

                    console.log("🚀 Enviando al visualizador:", visualizerState);
                    window.currentVisualizer.updateTrackState(visualizerState);
                } else {
                    console.warn("⚠️ Visualizador no disponible o no tiene updateTrackState");
                    console.log("🔍 window.currentVisualizer:", window.currentVisualizer);
                }

                errorCount = 0;

            } catch (error) {
                errorCount++;
                console.error("❌ Error en polling:", error.message);

                if (errorCount >= MAX_ERRORS) {
                    console.error("❌ Demasiados errores, deteniendo polling");
                    if (pollInterval) {
                        clearInterval(pollInterval);
                        pollInterval = null;
                    }
                }
            } finally {
                isPolling = false;
            }
        }

        function updateNowPlayingUI(trackData) {
            console.log("🎨 Actualizando UI Now Playing...", trackData);

            // Elementos del DOM
            const nowPlayingCard = document.querySelector(".now-playing-card");
            if (!nowPlayingCard) {
                console.warn("⚠️ No se encontró .now-playing-card");
                return;
            }

            const title = nowPlayingCard.querySelector(".now-playing-card__title");
            const artist = nowPlayingCard.querySelector(".now-playing-card__artist");
            const cover = nowPlayingCard.querySelector(".now-playing-card__cover");
            const metaContainer = nowPlayingCard.querySelector(".now-playing-card__meta");

            if (!title || !artist || !cover || !metaContainer) {
                console.warn("⚠️ Elementos del DOM no encontrados");
                return;
            }

            if (trackData.is_playing === false) {
                title.textContent = "No hay canción reproduciéndose";
                artist.textContent = "Reproduce música en Spotify";
                cover.innerHTML = '<span>♪</span>';

                if (metaContainer) {
                    metaContainer.innerHTML = '<span class="now-playing-card__meta-item">Esperando música</span>';
                }
                return;
            }

            if (trackData.item) {
                // Título
                title.textContent = trackData.item.name || "Sin título";

                // Artista(s)
                const artists = trackData.item.artists
                    ? trackData.item.artists.map(a => a.name).join(", ")
                    : "Artista desconocido";
                artist.textContent = artists;

                // Portada del álbum
                if (trackData.item.album && trackData.item.album.images && trackData.item.album.images.length > 0) {
                    const imageUrl = trackData.item.album.images[0].url;
                    cover.innerHTML = `<img src="${imageUrl}" alt="Album cover" style="width:100%;height:100%;object-fit:cover;">`;
                } else {
                    cover.innerHTML = '<span>♪</span>';
                }

                // Metadatos (audio features si están disponibles)
                let metaHTML = '';
                const features = trackData.audio_features || {};

                if (features.tempo) {
                    metaHTML += `<span class="now-playing-card__meta-item">${Math.round(features.tempo)} BPM</span>`;
                }
                if (features.energy) {
                    const energyPercent = Math.round(features.energy * 100);
                    metaHTML += `<span class="now-playing-card__meta-item">Energía: ${energyPercent}%</span>`;
                }
                if (features.danceability) {
                    const dancePercent = Math.round(features.danceability * 100);
                    metaHTML += `<span class="now-playing-card__meta-item">Bailabilidad: ${dancePercent}%</span>`;
                }
                if (features.valence) {
                    const valencePercent = Math.round(features.valence * 100);
                    metaHTML += `<span class="now-playing-card__meta-item">Positividad: ${valencePercent}%</span>`;
                }

                // Si no hay metadatos, mostrar duración
                if (!metaHTML && trackData.item.duration_ms) {
                    const minutes = Math.floor(trackData.item.duration_ms / 60000);
                    const seconds = Math.floor((trackData.item.duration_ms % 60000) / 1000);
                    metaHTML += `<span class="now-playing-card__meta-item">${minutes}:${seconds.toString().padStart(2, '0')}</span>`;
                }

                metaContainer.innerHTML = metaHTML || '<span class="now-playing-card__meta-item">Reproduciendo</span>';

                console.log("✅ UI actualizada correctamente");
            }
        }

        // Iniciar polling cada 5 segundos solo si hay API y está autenticado
        if (api && auth.isAuthenticated()) {
            pollInterval = setInterval(pollData, 5000);

            // Primera llamada inmediata
            setTimeout(pollData, 1000);

            console.log("✅ Polling iniciado (cada 5 segundos)");
        }

        // Limpiar al salir
        window.addEventListener("beforeunload", function() {
            if (pollInterval) {
                clearInterval(pollInterval);
                console.log("🧹 Polling detenido");
            }
        });
    }

    function showError(message) {
        console.error("🚨 Error mostrado al usuario:", message);

        const errorDiv = document.createElement("div");
        errorDiv.style.cssText = "position: fixed; top: 20px; right: 20px; background: #ef4444; color: white; padding: 15px 20px; border-radius: 8px; z-index: 9999; max-width: 400px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); animation: slideIn 0.3s ease;";

        errorDiv.innerHTML = '<strong>⚠️ Error</strong><p style="margin: 5px 0 0 0; font-size: 14px;">' + message + '</p><button onclick="this.parentElement.remove()" style="background: transparent; border: 1px solid white; color: white; padding: 5px 10px; margin-top: 10px; border-radius: 4px; cursor: pointer;">Cerrar</button>';

        document.body.appendChild(errorDiv);

        // Auto-remover después de 10 segundos
        setTimeout(function() {
            if (errorDiv.parentElement) {
                errorDiv.remove();
            }
        }, 10000);
    }

    // Iniciar cuando el DOM esté listo
    if (document.readyState === "loading") {
        console.log("⏳ Esperando DOM...");
        document.addEventListener("DOMContentLoaded", function() {
            console.log("✅ DOM cargado, iniciando aplicación...");
            initializeApplication();
        });
    } else {
        console.log("✅ DOM ya cargado, iniciando inmediatamente...");
        initializeApplication();
    }

    // DEPURACIÓN: Verificar estado después de 3 segundos
    // Diagnóstico automático después de 3 segundos
    // DIAGNÓSTICO AUTOMÁTICO (3 segundos después)
    setTimeout(function() {
        console.log("🔍 DIAGNÓSTICO AUTOMÁTICO (3 segundos después):");
        console.log("----------------------------------------");

        // 1. Verificar scripts cargados
        console.log("1. Scripts cargados:");
        console.log("   - ColorSync:", window.ColorSync ? "✅" : "❌");
        console.log("   - ParticlesVisualizer:", window.ParticlesVisualizer ? "✅" : "❌");
        console.log("   - SpectrumVisualizer:", window.SpectrumVisualizer ? "✅" : "❌");
        console.log("   - VisualizerManager:", window.VisualizerManager ? "✅" : "❌");

        // 2. Verificar canvas
        const canvas = document.getElementById("audioVisualizer");
        console.log("2. Canvas creado:", canvas ? "✅" : "❌");
        if (canvas) {
            console.log("   - Dimensiones:", canvas.width, "x", canvas.height);
            console.log("   - En contenedor:", canvas.parentElement.id);
        }

        // 3. Verificar visualizador
        console.log("3. Visualizador global:", window.currentVisualizer ? "✅" : "❌");
        if (window.currentVisualizer) {
            console.log("   - Tipo:", window.currentVisualizer.constructor.name);
            console.log("   - Tiene updateTrackState?:",
                typeof window.currentVisualizer.updateTrackState === 'function' ? "✅" : "❌");
        }

        // 4. Verificar contenedor
        const container = document.getElementById("visualizerContainer");
        console.log("4. Contenedor existe:", container ? "✅" : "❌");

        console.log("----------------------------------------");

        // Si falta algo, intentar reparar
        if (!window.currentVisualizer && window.VisualizerManager) {
            console.log("⚠️ Visualizador no creado pero VisualizerManager está disponible");
            console.log("🔄 Intentando crear visualizador ahora...");

            // Usar window.layout si existe, o crear uno nuevo
            const layoutInstance = window.layout || new LayoutManager();
            initVisualizer(layoutInstance);
        }

    }, 3000);

})();