// frontend/js/visualizer/visualizer.js
// Orquestador: conecta trackData -> ColorSync -> Particles / Spectrum

(function () {
    class VisualizerManager {
        constructor(canvas) {
            this.canvas = canvas;

            const cfg = window.AppConfig?.visualizer || {};
            const nodeCount = cfg.nodeCount || 80;
            const connDist = cfg.connectionDistance || 150;

            this.particles = new window.ParticlesVisualizer(canvas, {
                nodeCount,
                connectionDistance: connDist
            });

            this.spectrum = new window.SpectrumVisualizer(canvas, {
                barCount: 56
            });

            this.currentEffect = 'particles';
            this.activeInstance = this.particles;

            this.currentTheme = null;
            this.currentFeatures = null;

            this._setup();
        }

        _setup() {
            // Efecto por defecto
            this.particles.start();
            this.spectrum.stop();
        }

        setEffect(effectName) {
            if (effectName === this.currentEffect) return;
            this.currentEffect = effectName;

            if (effectName === 'particles') {
                this.spectrum.stop();
                this.particles.start();
                this.activeInstance = this.particles;
            } else if (effectName === 'spectrum') {
                this.particles.stop();
                this.spectrum.start();
                this.activeInstance = this.spectrum;
            }

            if (this.currentTheme) {
                this.activeInstance.setTheme(this.currentTheme);
            }
            if (this.currentFeatures) {
                this.activeInstance.setFeatures(this.currentFeatures);
            }
        }

        async updateFromTrack(trackData) {
            if (!trackData || !trackData.item) return;

            const features = trackData.audio_features || {};
            this.currentFeatures = features;

            if (this.activeInstance) {
                this.activeInstance.setFeatures(features);
            }

            try {
                const theme = await window.ColorSync.buildThemeFromTrack(trackData);
                this.currentTheme = theme;

                this.particles.setTheme(theme);
                this.spectrum.setTheme(theme);

                // Avisar al layout para que cambie el fondo del dashboard
                window.dispatchEvent(
                    new CustomEvent('visualizer:album-colors', {
                        detail: {
                            dominantHex: theme.primary,
                            secondaryHex: theme.secondary
                        }
                    })
                );
            } catch (e) {
                console.error('[VisualizerManager] Error construyendo tema:', e);
            }
        }

        destroy() {
            this.particles.destroy();
            this.spectrum.destroy();
        }
    }

    // Instancia global autocreada cuando el layout avisa que el canvas está listo
    let globalManager = null;

    window.addEventListener('layout:canvas-ready', (e) => {
        const canvas = e.detail?.canvas;
        if (!canvas) return;

        globalManager = new VisualizerManager(canvas);
        window.visualizerManager = globalManager;
        console.log('🎨 VisualizerManager inicializado');
    });

    // Cuando LayoutManager actualiza Now Playing -> refrescar visualizer
    window.addEventListener('layout:now-playing-updated', (e) => {
        if (!globalManager) return;
        const { trackData } = e.detail || {};
        if (trackData) {
            globalManager.updateFromTrack(trackData);
        }
    });

    window.VisualizerManager = VisualizerManager;
})();
