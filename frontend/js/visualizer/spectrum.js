// js/visualizer/spectrum.js
(function () {

    class SpectrumVisualizer {
        constructor(canvas, palette) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.width = canvas.clientWidth || 800;
            this.height = canvas.clientHeight || 400;
            this.canvas.width = this.width;
            this.canvas.height = this.height;

            this.palette = palette || {
                primary: '#22c55e',
                secondary: '#38bdf8',
                accent: '#f97316',
                mood: 'balanced'
            };

            this.barCount = 64;
            this.bars = new Array(this.barCount).fill(0);
            this.frequencies = new Array(this.barCount).fill(0);
            this.peaks = new Array(this.barCount).fill(0);
            this.particles = [];

            this.audioFeatures = {
                energy: 0.5,
                danceability: 0.5,
                valence: 0.5,
                tempo: 120,
                acousticness: 0.5,
                instrumentalness: 0,
                speechiness: 0.1,
                liveness: 0.2,
                loudness: -10,
                key: 0,
                mode: 1,
                time_signature: 4
            };
            this.durationMs = 180000;
            this.progressMs = 0;
            this.isPlaying = false;

            this._lastTimestamp = null;
            this._rafId = null;
            this._time = 0;
        }

        setPalette(palette) {
            if (palette) this.palette = palette;
        }

        resize(width, height) {
            this.width = width;
            this.height = height;
            this.canvas.width = width;
            this.canvas.height = height;
        }

        setTrackState({ audioFeatures, durationMs, progressMs, isPlaying }) {
            this.audioFeatures = Object.assign({}, this.audioFeatures, audioFeatures || {});
            if (durationMs) this.durationMs = durationMs;
            if (typeof progressMs === 'number') this.progressMs = progressMs;
            this.isPlaying = !!isPlaying;
        }

        start() {
            if (this._rafId) return;
            this._lastTimestamp = performance.now();
            const loop = (ts) => {
                const dt = (ts - this._lastTimestamp) / 1000;
                this._lastTimestamp = ts;
                this._time += dt;
                this._render(dt);
                this._rafId = requestAnimationFrame(loop);
            };
            this._rafId = requestAnimationFrame(loop);
        }

        stop() {
            if (this._rafId) {
                cancelAnimationFrame(this._rafId);
                this._rafId = null;
            }
        }

        _render(dt) {
            const ctx = this.ctx;
            const w = this.width;
            const h = this.height;

            // Fondo dinámico basado en energy y valence
            const energy = this.audioFeatures.energy ?? 0.5;
            const valence = this.audioFeatures.valence ?? 0.5;
            const acoustic = this.audioFeatures.acousticness ?? 0.5;

            // Gradiente de fondo
            const gradient = ctx.createLinearGradient(0, 0, 0, h);
            gradient.addColorStop(0, `hsla(200, 30%, ${5 + energy * 5}%, 1)`);
            gradient.addColorStop(1, `hsla(220, 40%, ${2 + valence * 3}%, 1)`);

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, w, h);

            // Obtener parámetros de audio
            const dance = this.audioFeatures.danceability ?? 0.5;
            const tempo = this.audioFeatures.tempo ?? 120;
            const instrumental = this.audioFeatures.instrumentalness ?? 0;
            const speech = this.audioFeatures.speechiness ?? 0.1;
            const liveness = this.audioFeatures.liveness ?? 0.2;
            const loudness = this.audioFeatures.loudness ?? -10;
            const key = this.audioFeatures.key ?? 0;
            const mode = this.audioFeatures.mode ?? 1;
            const timeSig = this.audioFeatures.time_signature ?? 4;

            const progress = Math.min(1, Math.max(0, this.progressMs / (this.durationMs || 1)));

            // Calcular número de barras dinámicamente
            const barCount = 32 + Math.floor(energy * 64) + Math.floor(tempo / 10);
            if (barCount !== this.barCount) {
                this.barCount = barCount;
                this.bars = new Array(this.barCount).fill(0);
                this.frequencies = new Array(this.barCount).fill(0);
                this.peaks = new Array(this.barCount).fill(0);
            }

            const barWidth = (w / this.barCount) * 0.8;
            const gap = (w / this.barCount) * 0.2;
            const maxHeight = h * (0.6 + dance * 0.3 - acoustic * 0.2);

            // Colores dinámicos basados en key, mode y valence
            const baseHue = (key * 30 + valence * 60) % 360;
            const hueVariation = mode === 1 ? 30 : 60; // Mayor variación para modo mayor
            const saturation = 60 + (valence * 30) + (energy * 10);
            const lightness = 50 + energy * 20 - acoustic * 10;

            // Simulación de frecuencias de audio
            const beatSpeed = tempo / 60;
            const time = this._time;

            // Actualizar partículas
            this._updateParticles(dt, w, h);

            // Dibujar barras
            for (let i = 0; i < this.barCount; i++) {
                const t = i / this.barCount;
                const x = i * (barWidth + gap) + gap * 0.5;

                // MULTIPLES ONDAS SUPERPUESTAS
                // 1. Onda principal (energy + tempo)
                const wave1 = Math.sin(time * beatSpeed * 2 + i * 0.2) * 0.5 + 0.5;

                // 2. Onda armónica (danceability)
                const wave2 = Math.sin(time * beatSpeed + i * 0.3 + Math.PI/4) * 0.3 + 0.5;

                // 3. Onda de pulso (time signature)
                const pulsePhase = time * (tempo / 60) * (timeSig / 4);
                const wave3 = (Math.sin(pulsePhase + i * 0.05) * 0.2 + 0.5) * (0.5 + liveness * 0.5);

                // 4. Onda caótica (speechiness + liveness)
                const chaos = (Math.random() - 0.5) * 2 * (speech + liveness) * 0.3;

                // 5. Onda progresiva (basada en progreso de la canción)
                const progressWave = Math.sin(progress * Math.PI * 8 + i * 0.1) * 0.1 + 0.9;

                // COMBINAR ONDAS
                let height = 0;
                height += wave1 * (energy * 0.6);
                height += wave2 * (dance * 0.4);
                height += wave3 * (0.3 + liveness * 0.3);
                height += chaos * 0.2;
                height *= progressWave;

                // EFECTOS ESPECIALES
                if (instrumental > 0.5) {
                    // Canciones instrumentales: ondas más limpias y periódicas
                    const cleanWave = Math.sin(time * beatSpeed * 4 + i * 0.15) * 0.2 + 0.8;
                    height *= cleanWave;
                }

                if (speech > 0.3) {
                    // Canciones con habla: picos aleatorios
                    if (Math.random() < speech * 0.1) {
                        height *= 1.5 + speech;
                    }
                }

                // Suavizar transiciones
                const current = this.bars[i];
                this.bars[i] = current * 0.6 + height * 0.8;

                // Rastrear picos
                if (this.bars[i] > this.peaks[i]) {
                    this.peaks[i] = this.bars[i];
                } else {
                    this.peaks[i] *= 0.98; // Decaimiento de picos
                }

                const barHeight = Math.max(2, this.bars[i] * maxHeight);
                const peakHeight = Math.max(2, this.peaks[i] * maxHeight);
                const y = h - barHeight;

                // GRADIENTE DINÁMICO PARA CADA BARRA
                const barHue = (baseHue + t * hueVariation) % 360;
                const barGradient = ctx.createLinearGradient(0, y, 0, h);
                barGradient.addColorStop(0, `hsla(${barHue}, ${saturation}%, ${lightness}%, 0.9)`);
                barGradient.addColorStop(0.7, `hsla(${barHue}, ${saturation}%, ${lightness - 20}%, 0.7)`);
                barGradient.addColorStop(1, `hsla(${barHue}, ${saturation}%, ${lightness - 40}%, 0.3)`);

                // DIBUJAR BARRA PRINCIPAL
                ctx.fillStyle = barGradient;
                ctx.fillRect(x, y, barWidth, barHeight);

                // EFECTO DE BRILLO (highlights)
                if (energy > 0.4) {
                    const highlightHeight = barHeight * 0.3;
                    const highlightGradient = ctx.createLinearGradient(0, y, 0, y + highlightHeight);
                    highlightGradient.addColorStop(0, `hsla(${barHue}, ${saturation}%, ${lightness + 30}%, 0.6)`);
                    highlightGradient.addColorStop(1, 'transparent');

                    ctx.fillStyle = highlightGradient;
                    ctx.fillRect(x, y, barWidth, highlightHeight);
                }

                // LÍNEA DE PICO
                if (this.peaks[i] > 0.7) {
                    const peakY = h - peakHeight;
                    ctx.strokeStyle = `hsla(${barHue + 60}, 100%, 80%, ${0.3 + energy * 0.5})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(x, peakY);
                    ctx.lineTo(x + barWidth, peakY);
                    ctx.stroke();
                }

                // EFECTO DE SOMBRA PARA ALTA ENERGÍA
                if (energy > 0.6) {
                    ctx.shadowColor = `hsla(${barHue}, 100%, 70%, 0.5)`;
                    ctx.shadowBlur = 10 + energy * 20;
                    ctx.fillRect(x, y, barWidth, barHeight);
                    ctx.shadowBlur = 0;
                }

                // GENERAR PARTÍCULAS DESDE PICO
                if (this.bars[i] > 0.85 && Math.random() < 0.05) {
                    this._createParticle(x + barWidth/2, y, barHue);
                }

                // ETIQUETA DE FRECUENCIA (solo para barras altas)
                if (barHeight > h * 0.4 && i % 4 === 0) {
                    const freqLabel = Math.floor((i / this.barCount) * 20000);
                    ctx.fillStyle = `hsla(${barHue}, 100%, 90%, 0.7)`;
                    ctx.font = '8px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(`${freqLabel}Hz`, x + barWidth/2, y - 5);
                }
            }

            // DIBUJAR PARTÍCULAS
            this._drawParticles(ctx);

            // EFECTO DE ONDA SUPERIOR
            this._drawTopWave(ctx, w, h);

            // INDICADOR DE PROGRESO
            if (this.isPlaying) {
                const progressX = w * progress;
                ctx.strokeStyle = `hsla(${baseHue}, 100%, 80%, 0.8)`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(progressX, 0);
                ctx.lineTo(progressX, h);
                ctx.stroke();
            }

            ctx.globalAlpha = 1;
        }

        _createParticle(x, y, hue) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 4,
                vy: -2 - Math.random() * 3,
                size: 1 + Math.random() * 3,
                hue: hue + (Math.random() - 0.5) * 60,
                life: 1,
                decay: 0.95 + Math.random() * 0.04
            });

            // Limitar número de partículas
            if (this.particles.length > 200) {
                this.particles.shift();
            }
        }

        _updateParticles(dt, w, h) {
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.1; // Gravedad
                p.life *= p.decay;

                // Eliminar partículas muertas o fuera de pantalla
                if (p.life < 0.1 || p.y > h || p.x < 0 || p.x > w) {
                    this.particles.splice(i, 1);
                }
            }
        }

        _drawParticles(ctx) {
            const energy = this.audioFeatures.energy ?? 0.5;

            for (const p of this.particles) {
                const alpha = p.life * (0.3 + energy * 0.5);
                const size = p.size * p.life;

                // Partícula con glow
                ctx.shadowColor = `hsla(${p.hue}, 100%, 70%, 0.6)`;
                ctx.shadowBlur = size * 2;
                ctx.fillStyle = `hsla(${p.hue}, 100%, 80%, ${alpha})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
                ctx.fill();

                // Estela
                ctx.shadowBlur = 0;
                ctx.strokeStyle = `hsla(${p.hue}, 100%, 70%, ${alpha * 0.3})`;
                ctx.lineWidth = size * 0.5;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x - p.vx * 2, p.y - p.vy * 2);
                ctx.stroke();
            }
            ctx.shadowBlur = 0;
        }

        _drawTopWave(ctx, w, h) {
            const energy = this.audioFeatures.energy ?? 0.5;
            const tempo = this.audioFeatures.tempo ?? 120;
            const time = this._time;

            if (energy > 0.3) {
                ctx.strokeStyle = `hsla(200, 100%, 80%, ${0.2 + energy * 0.3})`;
                ctx.lineWidth = 1;
                ctx.beginPath();

                for (let x = 0; x < w; x += 2) {
                    const t = x / w;
                    const y = h * 0.1 + Math.sin(time * 2 + x * 0.02) * 10 * energy;
                    if (x === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }

                ctx.stroke();
            }
        }
    }

    window.SpectrumVisualizer = SpectrumVisualizer;
})();

