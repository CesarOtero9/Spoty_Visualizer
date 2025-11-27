// frontend/js/visualizer/spectrum.js
// Visualizador tipo barra / ecualizador (fake spectrum basado en features)

(function () {
    class SpectrumVisualizer {
        constructor(canvas, options = {}) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');

            this.options = Object.assign(
                {
                    barCount: 48
                },
                options
            );

            this.barCount = this.options.barCount;
            this.bars = new Array(this.barCount).fill(0);

            this.intensity = 0.8;
            this.speedFactor = 1.0;
            this.tempo = 120;

            this.theme = {
                primary: '#22c55e',
                secondary: '#0ea5e9',
                accent: '#f97316'
            };

            this.running = false;
            this.lastTime = performance.now();

            this._handleResize = this.resize.bind(this);
            window.addEventListener('resize', this._handleResize);
            this.resize();
        }

        resize() {
            const rect = this.canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            this.canvas.width = rect.width * dpr;
            this.canvas.height = rect.height * dpr;
            this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        setTheme(theme) {
            if (!theme) return;
            this.theme = { ...this.theme, ...theme };
        }

        setFeatures(features) {
            const energy = typeof features?.energy === 'number' ? features.energy : 0.6;
            const dance = typeof features?.danceability === 'number' ? features.danceability : 0.5;
            const tempo = typeof features?.tempo === 'number' ? features.tempo : 120;
            const valence = typeof features?.valence === 'number' ? features.valence : 0.5;

            // Altura de barras
            this.intensity = 0.3 + energy * 1.0; // 0.3 .. 1.3

            // Velocidad de animación: mezcla de baile + energía
            this.speedFactor = 0.7 + dance * 0.9 + energy * 0.4;

            // El tempo afecta al movimiento interno de las ondas
            this.tempo = tempo;
            this.valence = valence;

            // Energy = más barras (hasta el ~doble)
            const baseBars = this.options.barCount || 48;
            const extraBars = Math.round(energy * baseBars);
            const newCount = baseBars + extraBars;

            if (newCount !== this.barCount) {
                this.barCount = newCount;
                this.bars = new Array(this.barCount).fill(0);
            }
        }


        start() {
            if (this.running) return;
            this.running = true;
            this.lastTime = performance.now();
            requestAnimationFrame(this._loop.bind(this));
        }

        stop() {
            this.running = false;
        }

        _loop(timestamp) {
            if (!this.running) return;
            const dt = (timestamp - this.lastTime) / 16.67;
            this.lastTime = timestamp;

            this._update(dt);
            this._draw();

            requestAnimationFrame(this._loop.bind(this));
        }

        _update(dt) {
            const time = this.lastTime * 0.001 * this.speedFactor * (this.tempo / 120);

            for (let i = 0; i < this.barCount; i++) {
                const phase = time * 2 + i * 0.27;
                const wave = (Math.sin(phase) + 1) / 2; // 0..1
                const jitter = Math.random() * 0.25;
                const target = this.intensity * (0.35 + 0.65 * wave) + jitter * 0.4;

                // interpolación suave
                this.bars[i] += (target - this.bars[i]) * 0.15 * dt;
            }
        }

        _draw() {
            const ctx = this.ctx;
            const w = this.canvas.width;
            const h = this.canvas.height;

            ctx.save();
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = 'rgba(3, 7, 18, 0.45)';
            ctx.fillRect(0, 0, w, h);
            ctx.restore();

            const primary = this.theme.primary || '#22c55e';
            const accent = this.theme.accent || '#f97316';

            const pr = window.ColorSync?.hexToRgb
                ? window.ColorSync.hexToRgb(primary) || { r: 34, g: 197, b: 94 }
                : { r: 34, g: 197, b: 94 };
            const ar = window.ColorSync?.hexToRgb
                ? window.ColorSync.hexToRgb(accent) || { r: 249, g: 115, b: 22 }
                : { r: 249, g: 115, b: 22 };

            const barWidth = w / this.barCount;

            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.lineCap = 'round';

            for (let i = 0; i < this.barCount; i++) {
                const x = i * barWidth + barWidth * 0.2;
                const value = this.bars[i];

                const barHeight = value * (h * 0.7);
                const y = h - barHeight - 10;

                const t = value;
                const r = Math.round(pr.r * (1 - t) + ar.r * t);
                const g = Math.round(pr.g * (1 - t) + ar.g * t);
                const bCol = Math.round(pr.b * (1 - t) + ar.b * t);

                const grad = ctx.createLinearGradient(
                    x,
                    h,
                    x,
                    y
                );
                grad.addColorStop(0, `rgba(${pr.r},${pr.g},${pr.b},0.15)`);
                grad.addColorStop(1, `rgba(${r},${g},${bCol},0.9)`);

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.roundRect(x, y, barWidth * 0.6, barHeight, 999);
                ctx.fill();
            }

            ctx.restore();
        }

        destroy() {
            this.stop();
            window.removeEventListener('resize', this._handleResize);
            this.bars = [];
        }
    }

    window.SpectrumVisualizer = SpectrumVisualizer;
})();
