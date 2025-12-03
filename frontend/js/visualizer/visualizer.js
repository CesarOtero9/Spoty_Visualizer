// js/visualizer/visualizer.js
// GESTOR PRINCIPAL DE VISUALIZADORES MEJORADO

(function () {
    "use strict";

    class EnhancedVisualizerManager {
        constructor(canvas, colorSync) {
            console.log("🎮 EnhancedVisualizerManager inicializando...");

            this.canvas = canvas;
            this.ctx = canvas.getContext('2d', { alpha: true });

            // ✅ CORREGIDO: Usar window.ColorSync para referencia global
            if (!colorSync && window.ColorSync) {
                this.colorSync = new window.ColorSync();
            } else {
                this.colorSync = colorSync;
            }

            this.container = canvas.closest('.visualizer-container') || canvas.parentElement;
            this.currentMode = 'creative_nodes'; // Modo por defecto
            this.visualizers = {};
            this.activeVisualizer = null;

            // Estado actual
            this.currentTrackState = {
                isPlaying: false,
                audioFeatures: {},
                albumColors: null,
                movementRules: null,
                durationMs: 0,
                progressMs: 0
            };

            // Verificar que los visualizadores existen
            this._checkDependencies();

            // Inicializar visualizadores
            this._initializeVisualizers();

            // Configurar eventos
            this._setupEventListeners();

            console.log("🎮 EnhancedVisualizerManager listo ✅");
        }

        _checkDependencies() {
            console.log("🔍 Verificando dependencias...");

            const dependencies = {
                'ColorSync': window.ColorSync,
                'CreativeNodesVisualizer': window.CreativeNodesVisualizer,
                'SpectrumVisualizer': window.SpectrumVisualizer,
                'ParticlesVisualizer': window.ParticlesVisualizer
            };

            let missing = [];
            for (const [name, dep] of Object.entries(dependencies)) {
                if (!dep) {
                    missing.push(name);
                    console.error(`❌ ${name} no está disponible`);
                } else {
                    console.log(`✅ ${name} disponible`);
                }
            }

            if (missing.length > 0) {
                console.error(`⚠️ Faltan dependencias: ${missing.join(', ')}`);
                console.error("   Verifica el orden de carga de los scripts");
            }
        }

        _initializeVisualizers() {
            console.log("🎮 Inicializando visualizadores...");

            // Crear canvas para cada visualizador
            this._createCanvas();

            // Obtener dimensiones
            const rect = this.canvas.getBoundingClientRect();
            const width = rect.width || this.container.clientWidth || 800;
            const height = rect.height || this.container.clientHeight || 400;

            // Paleta inicial
            const initialPalette = this.colorSync.getPalette(
                { energy: 0.3, danceability: 0.3, valence: 0.5, tempo: 80 },
                180000
            );

            // Inicializar CreativeNodesVisualizer (nuevo sistema)
            if (window.CreativeNodesVisualizer) {
                try {
                    this.visualizers.creative_nodes = new window.CreativeNodesVisualizer(this.canvas, initialPalette);

                    // También crear alias para particles (misma instancia o nueva instancia)
                    // Opción A: Misma instancia (compartida)
                    this.visualizers.particles = this.visualizers.creative_nodes;

                    // Opción B: Nueva instancia (si quieres separadas)
                    // this.visualizers.particles = new window.ParticlesVisualizer(this.canvas, initialPalette);

                    console.log("✅ CreativeNodesVisualizer inicializado (y asignado a particles)");
                } catch (error) {
                    console.error("❌ Error inicializando CreativeNodesVisualizer:", error);
                }
            }

            // Inicializar SpectrumVisualizer (para compatibilidad)
            if (window.SpectrumVisualizer) {
                try {
                    this.visualizers.spectrum = new window.SpectrumVisualizer(this.canvas, initialPalette);
                    console.log("✅ SpectrumVisualizer inicializado");
                } catch (error) {
                    console.error("❌ Error inicializando SpectrumVisualizer:", error);
                }
            }

            // Inicializar ParticlesVisualizer (solo si no se creó antes)
            if (window.ParticlesVisualizer && !this.visualizers.particles) {
                try {
                    this.visualizers.particles = new window.ParticlesVisualizer(this.canvas, initialPalette);
                    console.log("✅ ParticlesVisualizer inicializado (compatibilidad)");
                } catch (error) {
                    console.error("❌ Error inicializando ParticlesVisualizer:", error);
                }
            }

            // Establecer visualizador activo
            this.activeVisualizer = this.visualizers.creative_nodes ||
                                   this.visualizers.spectrum ||
                                   this.visualizers.particles;

            if (!this.activeVisualizer) {
                console.error("❌ No hay visualizadores disponibles");
                this._showError("No se pudieron inicializar los visualizadores");
                return;
            }

            // Iniciar visualizador activo
            if (this.activeVisualizer.start) {
                this.activeVisualizer.start();
            }

            console.log(`🎮 Visualizador activo: ${this.activeVisualizer.constructor.name}`);
        }

        _createCanvas() {
            // Eliminar canvas existente si hay
            const existingCanvas = document.getElementById("audioVisualizer");
            if (existingCanvas && existingCanvas !== this.canvas) {
                console.log("🗑️ Eliminando canvas existente");
                existingCanvas.remove();
            }

            // Configurar canvas
            this.canvas.id = "audioVisualizer";
            this.canvas.className = "visualizer-canvas";

            // Asegurar dimensiones correctas
            const rect = this.container.getBoundingClientRect();
            this.canvas.width = rect.width || 800;
            this.canvas.height = rect.height || 400;
            this.canvas.style.width = "100%";
            this.canvas.style.height = "100%";

            console.log(`🎨 Canvas creado: ${this.canvas.width}x${this.canvas.height}`);
        }

        _setupEventListeners() {
            // Redimensionar ventana
            window.addEventListener('resize', () => this._handleResize());

            // Eventos de teclado para debugging
            document.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.key === 'd') {
                    this._debugInfo();
                }
            });

            // Configurar botones de modo
            this._setupModeButtons();

            // Redimensionar inicial
            setTimeout(() => this._handleResize(), 100);
        }

        _setupModeButtons() {
            const modeButtons = document.querySelectorAll("[data-visualizer-mode]");

            modeButtons.forEach(btn => {
                btn.addEventListener("click", (e) => {
                    const mode = e.currentTarget.getAttribute("data-visualizer-mode");
                    console.log(`🎛️ Cambiando a modo: ${mode}`);
                    this.setMode(mode);
                });
            });

            // Activar botón del modo actual
            this._updateModeButtons();
        }

        _updateModeButtons() {
            const modeButtons = document.querySelectorAll("[data-visualizer-mode]");

            modeButtons.forEach(btn => {
                const mode = btn.getAttribute("data-visualizer-mode");
                const isActive = mode === this.currentMode;

                if (isActive) {
                    btn.classList.add('visualizer-controls__btn--active');
                    btn.classList.add('ui-btn--primary');
                    btn.classList.remove('ui-btn--ghost');
                } else {
                    btn.classList.remove('visualizer-controls__btn--active');
                    btn.classList.remove('ui-btn--primary');
                    btn.classList.add('ui-btn--ghost');
                }
            });
        }

        _handleResize() {
            const rect = this.container.getBoundingClientRect();
            const width = rect.width;
            const height = rect.height;

            if (width === 0 || height === 0) {
                console.warn("⚠️ Dimensiones del contenedor son 0, usando valores por defecto");
                return;
            }

            console.log(`🔄 Redimensionando a: ${width}x${height}`);

            // Actualizar canvas
            this.canvas.width = width;
            this.canvas.height = height;

            // Redimensionar todos los visualizadores
            Object.values(this.visualizers).forEach(visualizer => {
                if (visualizer && visualizer.resize) {
                    try {
                        visualizer.resize(width, height);
                    } catch (error) {
                        console.error(`❌ Error redimensionando ${visualizer.constructor.name}:`, error);
                    }
                }
            });
        }

        _showError(message) {
            console.error("🚨 Error visual:", message);

            this.container.innerHTML = `
                <div style="
                    color: #ef4444;
                    text-align: center;
                    padding: 40px;
                    background: rgba(239, 68, 68, 0.1);
                    border-radius: 10px;
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    margin: 20px;
                ">
                    <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                    <h3 style="margin-bottom: 10px;">Error en el visualizador</h3>
                    <p style="
                        font-family: monospace;
                        background: #1f2937;
                        padding: 15px;
                        border-radius: 5px;
                        margin: 15px 0;
                        word-break: break-word;
                    ">
                        ${message}
                    </p>
                    <div style="margin-top: 20px;">
                        <button onclick="location.reload()" style="
                            padding: 10px 20px;
                            background: #ef4444;
                            color: white;
                            border: none;
                            border-radius: 5px;
                            cursor: pointer;
                            margin-right: 10px;
                        ">
                            Recargar página
                        </button>
                        <button onclick="console.log(window.currentVisualizer)" style="
                            padding: 10px 20px;
                            background: #3b82f6;
                            color: white;
                            border: none;
                            border-radius: 5px;
                            cursor: pointer;
                        ">
                            Debug en consola
                        </button>
                    </div>
                </div>
            `;
        }

        _debugInfo() {
            console.log("🔍 DEBUG EnhancedVisualizerManager:");
            console.log("================================");
            console.log("Modo actual:", this.currentMode);
            console.log("Visualizadores disponibles:", Object.keys(this.visualizers));
            console.log("Visualizador activo:", this.activeVisualizer?.constructor?.name);
            console.log("Estado de track:", this.currentTrackState);
            console.log("ColorSync disponible:", !!this.colorSync);
            console.log("Canvas dimensions:", `${this.canvas.width}x${this.canvas.height}`);
            console.log("================================");
        }

        // ================== MÉTODOS PÚBLICOS ==================

        setMode(mode) {
            if (mode === this.currentMode) {
                console.log(`🎮 Ya está en modo ${mode}`);
                return;
            }

            console.log(`🎮 Cambiando de ${this.currentMode} a ${mode}`);

            // Detener visualizador actual
            if (this.activeVisualizer && this.activeVisualizer.stop) {
                try {
                    this.activeVisualizer.stop();
                    console.log(`⏸️ ${this.activeVisualizer.constructor?.name} detenido`);
                } catch (error) {
                    console.error("❌ Error deteniendo visualizador:", error);
                }
            }

            // Buscar nuevo visualizador
            let newVisualizer = this.visualizers[mode];

            // Si no existe el modo específico, buscar alternativas
            if (!newVisualizer) {
                if (mode === 'particles' && this.visualizers.creative_nodes) {
                    newVisualizer = this.visualizers.creative_nodes;
                    mode = 'creative_nodes';
                    console.log("🎮 Usando creative_nodes como alternativa a particles");
                } else if (mode === 'creative_nodes' && this.visualizers.particles) {
                    newVisualizer = this.visualizers.particles;
                    mode = 'particles';
                    console.log("🎮 Usando particles como alternativa a creative_nodes");
                } else {
                    console.error(`❌ Modo ${mode} no disponible`);
                    return;
                }
            }

            // Actualizar modo y visualizador activo
            this.currentMode = mode;
            this.activeVisualizer = newVisualizer;

            // Aplicar estado actual al nuevo visualizador
            if (this.currentTrackState && this.activeVisualizer.setTrackState) {
                console.log("🔄 Aplicando estado actual al nuevo visualizador...");
                this.activeVisualizer.setTrackState(this.currentTrackState);
            }

            // Iniciar nuevo visualizador
            if (this.activeVisualizer.start) {
                try {
                    this.activeVisualizer.start();
                    console.log(`▶️ ${this.activeVisualizer.constructor?.name} iniciado`);
                } catch (error) {
                    console.error("❌ Error iniciando visualizador:", error);
                }
            }

            // Actualizar UI
            this._updateModeButtons();

            // Aplicar colores del álbum si existen
            if (this.currentTrackState.albumColors && this.colorSync.applyAlbumColors) {
                this.colorSync.applyAlbumColors(this.container, this.currentTrackState.albumColors);
            }

            console.log(`🎮 Modo cambiado exitosamente a: ${mode}`);
        }

        updateTrackState(state) {
            if (!state) {
                console.warn("⚠️ updateTrackState recibió state null/undefined");
                return;
            }

            console.log("🎮 Actualizando estado del track...");

            // Guardar estado actual
            this.currentTrackState = {
                isPlaying: state.isPlaying || false,
                audioFeatures: state.audioFeatures || {},
                albumColors: state.albumColors || state.album_colors || null,
                movementRules: state.movementRules || state.movement_rules || null,
                durationMs: state.durationMs || 0,
                progressMs: state.progressMs || 0,
                // Datos adicionales para compatibilidad
                palette: state.palette,
                visualizer: state.visualizer
            };

            // Debug info
            console.log("📊 Datos recibidos:", {
                hasAudioFeatures: !!state.audioFeatures,
                hasAlbumColors: !!this.currentTrackState.albumColors,
                hasMovementRules: !!this.currentTrackState.movementRules,
                isPlaying: this.currentTrackState.isPlaying,
                albumMood: this.currentTrackState.albumColors?.color_mood || 'N/A'
            });

            // 1. Aplicar colores del álbum al contenedor
            if (this.currentTrackState.albumColors && this.colorSync.applyAlbumColors) {
                console.log("🎨 Aplicando colores del álbum...");
                this.colorSync.applyAlbumColors(this.container, this.currentTrackState.albumColors);
            }

            // 2. Preparar datos para el visualizador
            const visualizerData = {
                audioFeatures: this.currentTrackState.audioFeatures,
                durationMs: this.currentTrackState.durationMs,
                progressMs: this.currentTrackState.progressMs,
                isPlaying: this.currentTrackState.isPlaying,
                albumColors: this.currentTrackState.albumColors,
                movement_rules: this.currentTrackState.movementRules,
                // Datos para compatibilidad con visualizadores antiguos
                palette: this.currentTrackState.albumColors ? {
                    dominant_hex: this.currentTrackState.albumColors.dominant_hex,
                    palette_hex: this.currentTrackState.albumColors.palette_hex,
                    color_mood: this.currentTrackState.albumColors.color_mood
                } : null
            };

            // 3. Actualizar visualizador activo
            if (this.activeVisualizer && this.activeVisualizer.setTrackState) {
                console.log("🔄 Actualizando visualizador activo...");
                try {
                    this.activeVisualizer.setTrackState(visualizerData);
                    console.log("✅ Visualizador actualizado");
                } catch (error) {
                    console.error("❌ Error actualizando visualizador:", error);
                }
            } else {
                console.warn("⚠️ Visualizador activo no tiene setTrackState");
            }

            // 4. Actualizar otros visualizadores (para cambio rápido de modo)
            Object.entries(this.visualizers).forEach(([mode, visualizer]) => {
                if (visualizer !== this.activeVisualizer && visualizer.setTrackState) {
                    try {
                        visualizer.setTrackState(visualizerData);
                    } catch (error) {
                        // Silenciar errores en visualizadores no activos
                    }
                }
            });

            // 5. Actualizar información de debug en UI si está disponible
            this._updateDebugInfo();

            console.log("🎮 Estado del track actualizado ✅");
        }

        _updateDebugInfo() {
            // Actualizar información de debug en la interfaz si existe
            const debugInfo = document.getElementById('debug-info');
            if (!debugInfo) return;

            const features = this.currentTrackState.audioFeatures;
            const colors = this.currentTrackState.albumColors;

            let infoHTML = `
                <div style="font-size: 12px; color: #9ca3af; margin-top: 10px;">
                    <div>🎵 <strong>Audio Features:</strong></div>
            `;

            if (features) {
                infoHTML += `
                    <div>Energy: ${(features.energy * 100).toFixed(0)}%</div>
                    <div>Tempo: ${Math.round(features.tempo || 0)} BPM</div>
                    <div>Dance: ${(features.danceability * 100).toFixed(0)}%</div>
                `;
            }

            if (colors) {
                infoHTML += `
                    <div style="margin-top: 5px;">🎨 <strong>Album Colors:</strong></div>
                    <div>Mood: ${colors.color_mood || 'N/A'}</div>
                    <div>Colors: ${colors.palette_hex?.length || 0} extracted</div>
                `;
            }

            infoHTML += `</div>`;
            debugInfo.innerHTML = infoHTML;
        }

        getCurrentMode() {
            return this.currentMode;
        }

        getActiveVisualizer() {
            return this.activeVisualizer;
        }

        getTrackState() {
            return this.currentTrackState;
        }

        // Método para testing/debugging
        simulateAudioFeatures(features = {}) {
            const mockFeatures = {
                energy: 0.7,
                danceability: 0.6,
                valence: 0.8,
                tempo: 128,
                acousticness: 0.3,
                instrumentalness: 0.2,
                speechiness: 0.1,
                liveness: 0.3,
                loudness: -8,
                key: 5,
                mode: 1,
                time_signature: 4,
                ...features
            };

            const mockState = {
                audioFeatures: mockFeatures,
                durationMs: 180000,
                progressMs: 45000,
                isPlaying: true,
                albumColors: {
                    dominant_hex: "#" + Math.floor(Math.random()*16777215).toString(16),
                    palette_hex: ["#22c55e", "#3b82f6", "#a855f7"],
                    color_mood: "vibrant"
                }
            };

            this.updateTrackState(mockState);
            console.log("🎮 Simulación de audio features activada");
        }

        // Método para animación manual (sin música)
        startIdleAnimation() {
            const idleFeatures = {
                energy: 0.3,
                danceability: 0.3,
                valence: 0.5,
                tempo: 80,
                acousticness: 0.5,
                instrumentalness: 0,
                speechiness: 0.1,
                liveness: 0.2,
                loudness: -20,
                key: 0,
                mode: 1,
                time_signature: 4
            };

            const idleState = {
                audioFeatures: idleFeatures,
                durationMs: 180000,
                progressMs: 0,
                isPlaying: false,
                albumColors: {
                    dominant_hex: "#374151",
                    palette_hex: ["#374151", "#6b7280", "#9ca3af"],
                    color_mood: "idle"
                }
            };

            this.updateTrackState(idleState);
            console.log("🎮 Animación idle iniciada");
        }

        stop() {
            // Detener todos los visualizadores
            Object.values(this.visualizers).forEach(visualizer => {
                if (visualizer && visualizer.stop) {
                    try {
                        visualizer.stop();
                    } catch (error) {
                        console.error("Error deteniendo visualizador:", error);
                    }
                }
            });

            console.log("🎮 Todos los visualizadores detenidos");
        }

        destroy() {
            this.stop();

            // Limpiar referencias
            this.visualizers = {};
            this.activeVisualizer = null;
            this.colorSync = null;

            console.log("🎮 VisualizerManager destruido");
        }
    }

    // Exportar al ámbito global
    window.VisualizerManager = EnhancedVisualizerManager;

    // Alias para compatibilidad
    window.currentVisualizer = null;

    console.log("🎮 EnhancedVisualizerManager cargado ✅");

    // Inicialización automática cuando se carga el DOM
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function() {
            console.log("🎮 DOM cargado, listo para inicializar visualizador...");
        });
    }

})();