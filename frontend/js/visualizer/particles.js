-// frontend/js/visualizer/particles.js
// Visualizador principal de partículas tipo red de nodos.

(function () {
    class ParticlesVisualizer {
        constructor(canvas, options = {}) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');

            this.options = Object.assign(
                {
                    nodeCount: 80,
                    connectionDistance: 150
                },
                options
            );

            this.nodes = [];
            this.running = false;
            this.lastTime = performance.now();

            this.theme = {
                primary: '#22c55e',
                secondary: '#0ea5e9',
                accent: '#f97316',
                intensity: 0.9
            };

            this.speedFactor = 1.0;
            this.connectionDistance = this.options.connectionDistance;
            this.tempo = 120;

            this._handleResize = this.resize.bind(this);
            window.addEventListener('resize', this._handleResize);
            this.resize();
            this._initNodes(this.options.nodeCount);
        }

        resize() {
            const rect = this.canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            this.canvas.width = rect.width * dpr;
            this.canvas.height = rect.height * dpr;
            this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        _initNodes(count) {
            this.nodes = [];
            for (let i = 0; i < count; i++) {
                this.nodes.push(this._createNode());
            }
        }

        _createNode() {
            const w = this.canvas.width;
            const h = this.canvas.height;
            const baseSpeed = 0.05 + Math.random() * 0.15;

            return {
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() * 2 - 1) * baseSpeed,
                vy: (Math.random() * 2 - 1) * baseSpeed,
                size: 1.5 + Math.random() * 2.5,
                life: Math.random() * 10
            };
        }

        _addNodes(n) {
            for (let i = 0; i < n; i++) {
                this.nodes.push(this._createNode());
            }
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

            // Mucho más rango de velocidad y conexiones
            this.speedFactor = 0.5 + energy * 1.5;
            this.connectionDistance = 80 + dance * 170;
            this.tempo = tempo;
            this.valence = valence;

            // Nº de nodos controlado por la energía
            const minNodes = 50;
            const maxNodes = 180;
            const targetCount = Math.round(minNodes + (maxNodes - minNodes) * energy);

            if (this.nodes.length < targetCount) {
                this._addNodes(targetCount - this.nodes.length);
            } else if (this.nodes.length > targetCount) {
                this.nodes.length = targetCount;
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
            const dt = (timestamp - this.lastTime) / 16.67; // frames relativos a 60fps
            this.lastTime = timestamp;

            this._update(dt);
            this._draw();

            requestAnimationFrame(this._loop.bind(this));
        }

        _update(dt) {
            const w = this.canvas.width;
            const h = this.canvas.height;
            const speed = this.speedFactor;

            for (const n of this.nodes) {
                n.x += n.vx * dt * speed * 60;
                n.y += n.vy * dt * speed * 60;
                n.life += dt * 0.002 * speed;

                // Wrap suave
                if (n.x < -50) n.x = w + 50;
                if (n.x > w + 50) n.x = -50;
                if (n.y < -50) n.y = h + 50;
                if (n.y > h + 50) n.y = -50;
            }
        }

        _draw() {
            const ctx = this.ctx;
            const w = this.canvas.width;
            const h = this.canvas.height;

            // Fondo con rastro suave
            ctx.save();
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = 'rgba(3, 7, 18, 0.3)';
            ctx.fillRect(0, 0, w, h);
            ctx.restore();

            const primary = this.theme.primary || '#22c55e';
            const secondary = this.theme.secondary || '#0ea5e9';

            const pr = window.ColorSync?.hexToRgb
                ? window.ColorSync.hexToRgb(primary) || { r: 34, g: 197, b: 94 }
                : { r: 34, g: 197, b: 94 };
            const sr = window.ColorSync?.hexToRgb
                ? window.ColorSync.hexToRgb(secondary) || { r: 14, g: 165, b: 233 }
                : { r: 14, g: 165, b: 233 };

            // Conexiones entre nodos
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            for (let i = 0; i < this.nodes.length; i++) {
                const a = this.nodes[i];
                for (let j = i + 1; j < this.nodes.length; j++) {
                    const b = this.nodes[j];
                    const dx = a.x - b.x;
                    const dy = a.y - b.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < this.connectionDistance) {
                        const t = 1 - dist / this.connectionDistance;
                        const r = Math.round(pr.r * (1 - t) + sr.r * t);
                        const g = Math.round(pr.g * (1 - t) + sr.g * t);
                        const bCol = Math.round(pr.b * (1 - t) + sr.b * t);

                        ctx.strokeStyle = `rgba(${r},${g},${bCol},${0.10 + t * 0.35})`;
                        ctx.lineWidth = 0.5 + t * 1.4;
                        ctx.beginPath();
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(b.x, b.y);
                        ctx.stroke();
                    }
                }
            }
            ctx.restore();

            // Nodos
            // Nodos
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const timeBeat = this.lastTime * 0.001 * (this.tempo / 120);

            // Normalizamos tempo: 0.5x (lento) a 2x (rapidísimo)
            const tempoNorm = Math.min(Math.max(this.tempo / 120, 0.5), 2.0);

            for (const n of this.nodes) {
                const pulsate =
                    1 +
                    Math.sin(timeBeat * 2 + n.life * 8) *
                        0.35 *
                        (this.theme.intensity || 0.9);

                // Nodos más grandes en temas rápidos
                const sizeTempoFactor = 0.8 + tempoNorm * 0.8;
                const size = n.size * pulsate * sizeTempoFactor;

                ctx.beginPath();
                ctx.arc(n.x, n.y, size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${pr.r},${pr.g},${pr.b},${0.4 + 0.4 * (this.theme.intensity || 0.9)})`;
                ctx.shadowColor = `rgba(${sr.r},${sr.g},${sr.b},0.9)`;
                ctx.shadowBlur = 20 + 40 * (this.theme.intensity || 0.9);
                ctx.fill();
            }


            ctx.restore();
        }

        destroy() {
            this.stop();
            window.removeEventListener('resize', this._handleResize);
            this.nodes = [];
        }
    }

    window.ParticlesVisualizer = ParticlesVisualizer;
})();
