/*/ js/visualizer/particles.js
(function () {

    class Particle {
        constructor(width, height, params) {
            this.reset(width, height, params);
            this.angle = Math.random() * Math.PI * 2;
            this.spin = (Math.random() - 0.5) * 4;
            this.life = 1.0;
            this.decay = 0.95 + (Math.random() * 0.04);
            this.waveFrequency = 0.5 + Math.random() * 2;
            this.trail = [];
            this.maxTrail = 5;
            this.hue = Math.random() * 360;
        }

        reset(width, height, params) {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * params.baseSpeed * 0.5;
            this.vy = (Math.random() - 0.5) * params.baseSpeed * 0.5;
            this.baseSize = params.baseSize * (0.3 + Math.random() * 0.7);
            this.size = this.baseSize;
            this.alpha = 0.3 + Math.random() * 0.7;
            this.targetAlpha = this.alpha;
            this.colorType = Math.floor(Math.random() * 3);
            this.attractionForce = 0;
            this.attractionX = width / 2;
            this.attractionY = height / 2;
        }

        update(dt, width, height, params, audioFeatures, progress, time) {
            const energy = audioFeatures.energy ?? 0.5;
            const dance = audioFeatures.danceability ?? 0.5;
            const valence = audioFeatures.valence ?? 0.5;
            const tempo = audioFeatures.tempo ?? 120;
            const acoustic = audioFeatures.acousticness ?? 0.5;
            const instrumental = audioFeatures.instrumentalness ?? 0;
            const speech = audioFeatures.speechiness ?? 0.1;
            const liveness = audioFeatures.liveness ?? 0.2;
            const loudness = audioFeatures.loudness ?? -10;
            const key = audioFeatures.key ?? 0;
            const mode = audioFeatures.mode ?? 1;
            const timeSig = audioFeatures.time_signature ?? 4;

            // MOVIMIENTO AVANZADO
            // 1. Movimiento base (tempo + energy)
            const baseSpeed = params.baseSpeed * (0.5 + energy * 1.5) * (tempo / 120);

            // 2. Movimiento ondulatorio (danceability + valence)
            const waveX = Math.sin(time * this.waveFrequency + this.x * 0.01) * dance * 40;
            const waveY = Math.cos(time * this.waveFrequency * 0.8 + this.y * 0.01) * valence * 30;

            // 3. Movimiento espiral (instrumentalness)
            const spiralForce = instrumental * 0.5;
            const angleToCenter = Math.atan2(height/2 - this.y, width/2 - this.x);
            const spiralX = Math.cos(angleToCenter + time * 2) * spiralForce * 20;
            const spiralY = Math.sin(angleToCenter + time * 2) * spiralForce * 20;

            // 4. Movimiento caótico (liveness + speechiness)
            const chaosX = (Math.random() - 0.5) * 30 * (liveness + speech);
            const chaosY = (Math.random() - 0.5) * 30 * (liveness + speech);

            // 5. Atracción rítmica (time signature)
            const beatTime = time * (tempo / 60);
            const beatStrength = (Math.sin(beatTime * Math.PI * 2) * 0.5 + 0.5) * energy;

            // Combina todas las fuerzas
            this.vx = this.vx * 0.9 + (waveX + spiralX + chaosX) * dt * baseSpeed;
            this.vy = this.vy * 0.9 + (waveY + spiralY + chaosY) * dt * baseSpeed;

            // Aplicar atracción rítmica hacia el centro
            if (beatStrength > 0.3) {
                const dx = (width/2 - this.x) * 0.002 * beatStrength;
                const dy = (height/2 - this.y) * 0.002 * beatStrength;
                this.vx += dx;
                this.vy += dy;
            }

            this.x += this.vx * dt * params.speedBoost;
            this.y += this.vy * dt * params.speedBoost;

            // Comportamiento en bordes
            const bounceIntensity = params.bounceIntensity * (1 + liveness);
            if (this.x < 0 || this.x > width) {
                this.vx *= -bounceIntensity;
                this.x = Math.max(0, Math.min(width, this.x));
                this.hue = (this.hue + 30) % 360;
            }
            if (this.y < 0 || this.y > height) {
                this.vy *= -bounceIntensity;
                this.y = Math.max(0, Math.min(height, this.y));
                this.hue = (this.hue + 30) % 360;
            }

            // Actualizar trail
            this.trail.push({x: this.x, y: this.y});
            if (this.trail.length > this.maxTrail) {
                this.trail.shift();
            }

            // Rotación basada en instrumentalness
            this.angle += this.spin * dt * (1 + instrumental * 3);

            // Tamaño dinámico
            const sizeVariation = Math.sin(time * 2 + this.x * 0.01) * 0.3 + 0.7;
            const loudnessFactor = 1 + ((loudness + 60) / 40);
            this.size = this.baseSize * sizeVariation * loudnessFactor * (0.8 + dance * 0.4);

            // Alpha dinámico
            this.alpha = (0.2 + energy * 0.6) * (0.5 + valence * 0.5);

            // Cambio de color basado en key y mode
            this.hue = (this.hue + dt * 10 * energy) % 360;
        }

        draw(ctx, palette) {
            // Color dinámico basado en audio features
            const baseHue = this.hue;
            const saturation = 70 + (Math.sin(this.x * 0.01) * 20);
            const lightness = 50 + (Math.cos(this.y * 0.01) * 20);

            // Dibujar trail
            if (this.trail.length > 1) {
                ctx.strokeStyle = `hsla(${baseHue}, ${saturation}%, ${lightness}%, 0.2)`;
                ctx.lineWidth = this.size * 0.5;
                ctx.beginPath();
                ctx.moveTo(this.trail[0].x, this.trail[0].y);
                for (let i = 1; i < this.trail.length; i++) {
                    ctx.lineTo(this.trail[i].x, this.trail[i].y);
                }
                ctx.stroke();
            }

            // Dibujar partícula principal
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            ctx.globalAlpha = this.alpha;

            // Forma variable basada en speechiness
            if (Math.random() < 0.3) {
                // Forma estelar para picos
                this._drawStar(ctx, this.size, baseHue, saturation, lightness);
            } else {
                // Forma circular normal
                this._drawCircle(ctx, this.size, baseHue, saturation, lightness);
            }

            ctx.restore();
        }

        _drawCircle(ctx, size, hue, saturation, lightness) {
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
            gradient.addColorStop(0, `hsla(${hue}, ${saturation}%, ${lightness + 20}%, 1)`);
            gradient.addColorStop(1, `hsla(${hue}, ${saturation}%, ${lightness}%, 0.5)`);

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.fill();

            // Borde brillante
            ctx.strokeStyle = `hsla(${hue + 60}, ${saturation}%, ${lightness + 30}%, 0.8)`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }

        _drawStar(ctx, size, hue, saturation, lightness) {
            const points = 5 + Math.floor(Math.random() * 3);
            const innerRadius = size * 0.5;
            const outerRadius = size;

            ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, 0.8)`;
            ctx.beginPath();

            for (let i = 0; i < points * 2; i++) {
                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                const angle = (i * Math.PI) / points;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;

                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }

            ctx.closePath();
            ctx.fill();

            // Glow effect
            ctx.shadowColor = `hsla(${hue}, ${saturation}%, ${lightness}%, 0.6)`;
            ctx.shadowBlur = size * 2;
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    class ParticlesVisualizer {
        constructor(canvas, palette) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.width = canvas.clientWidth || 800;
            this.height = canvas.clientHeight || 400;
            this.canvas.width = this.width;
            this.canvas.height = this.height;

            this.particles = [];
            this.maxParticles = 120;
            this.params = {
                baseSpeed: 35,
                baseSize: 3,
                connectionDist: 120,
                speedBoost: 1,
                bounceIntensity: 0.8,
                connectionWidth: 0.8,
                connectionAlpha: 0.12
            };
            this.palette = palette || {
                primary: '#22c55e',
                secondary: '#38bdf8',
                accent: '#f97316',
                mood: 'balanced'
            };

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

            this._initParticles();
        }

        _initParticles() {
            this.particles = [];
            for (let i = 0; i < this.maxParticles; i++) {
                this.particles.push(new Particle(this.width, this.height, this.params));
            }
        }

        setPalette(palette) {
            if (palette) this.palette = palette;
        }

        resize(width, height) {
            this.width = width;
            this.height = height;
            this.canvas.width = width;
            this.canvas.height = height;
            this._initParticles();
        }

        setTrackState({ audioFeatures, durationMs, progressMs, isPlaying }) {
            this.audioFeatures = Object.assign({}, this.audioFeatures, audioFeatures || {});
            if (durationMs) this.durationMs = durationMs;
            if (typeof progressMs === 'number') this.progressMs = progressMs;
            this.isPlaying = !!isPlaying;

            // Ajustar parámetros basados en audio features
            const energy = this.audioFeatures.energy ?? 0.5;
            const dance = this.audioFeatures.danceability ?? 0.5;
            const valence = this.audioFeatures.valence ?? 0.5;
            const tempo = this.audioFeatures.tempo ?? 120;
            const acoustic = this.audioFeatures.acousticness ?? 0.5;
            const instrumental = this.audioFeatures.instrumentalness ?? 0;
            const speech = this.audioFeatures.speechiness ?? 0.1;
            const liveness = this.audioFeatures.liveness ?? 0.2;
            const loudness = this.audioFeatures.loudness ?? -10;
            const key = this.audioFeatures.key ?? 0;
            const mode = this.audioFeatures.mode ?? 1;
            const timeSig = this.audioFeatures.time_signature ?? 4;

            // Ajustar parámetros dinámicamente
            this.params.baseSpeed = 25 + energy * 60 + (tempo - 100) * 0.1;
            this.params.baseSize = 2 + dance * 3 + ((loudness + 60) / 20);
            this.params.connectionDist = 80 + valence * 80 - acoustic * 40;
            this.params.bounceIntensity = 0.5 + liveness * 1.5;
            this.params.connectionWidth = 0.5 + speech * 1.5;
            this.params.connectionAlpha = 0.08 + energy * 0.15;

            // Ajustar número de partículas
            const targetParticles = Math.floor(80 + energy * 120 + tempo / 5);
            if (targetParticles !== this.maxParticles) {
                this.maxParticles = targetParticles;
                this._initParticles();
            }
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

            // Fondo con fade suave
            ctx.fillStyle = `rgba(15, 23, 42, ${0.05 + (1 - (this.audioFeatures.energy || 0.5)) * 0.1})`;
            ctx.fillRect(0, 0, w, h);

            const progress = Math.min(1, Math.max(0, this.progressMs / (this.durationMs || 1)));
            const energy = this.audioFeatures.energy ?? 0.5;
            const valence = this.audioFeatures.valence ?? 0.5;
            const tempo = this.audioFeatures.tempo ?? 120;

            // speedBoost dinámico
            this.params.speedBoost = 0.8 + energy * 1.4 + Math.sin(progress * Math.PI * 2) * 0.2;

            // Actualizar y dibujar partículas
            for (const p of this.particles) {
                p.update(dt, w, h, this.params, this.audioFeatures, progress, this._time);
                p.draw(ctx, this.palette);
            }

            // Conexiones avanzadas entre partículas
            this._drawConnections(ctx, w, h);
        }

        _drawConnections(ctx, w, h) {
            const energy = this.audioFeatures.energy ?? 0.5;
            const valence = this.audioFeatures.valence ?? 0.5;
            const maxDist = this.params.connectionDist;

            // Configurar línea para conexiones
            ctx.lineWidth = this.params.connectionWidth;

            for (let i = 0; i < this.particles.length; i++) {
                const p1 = this.particles[i];
                for (let j = i + 1; j < this.particles.length; j++) {
                    const p2 = this.particles[j];
                    const dx = p1.x - p2.x;
                    const dy = p1.y - p2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < maxDist) {
                        // Calcular color y alpha basados en distancia y audio features
                        const alpha = this.params.connectionAlpha * (1 - dist / maxDist);
                        const hue = (p1.hue + p2.hue) / 2;

                        // Gradiente para la línea
                        const gradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
                        gradient.addColorStop(0, `hsla(${hue}, 80%, 70%, ${alpha})`);
                        gradient.addColorStop(1, `hsla(${hue + 60}, 80%, 70%, ${alpha * 0.5})`);

                        ctx.strokeStyle = gradient;
                        ctx.beginPath();
                        ctx.moveTo(p1.x, p1.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();

                        // Punto de conexión en el medio
                        if (dist < maxDist * 0.3) {
                            const midX = (p1.x + p2.x) / 2;
                            const midY = (p1.y + p2.y) / 2;

                            ctx.fillStyle = `hsla(${hue}, 100%, 80%, ${alpha * 1.5})`;
                            ctx.beginPath();
                            ctx.arc(midX, midY, 1, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    }
                }
            }
        }
    }

    window.ParticlesVisualizer = ParticlesVisualizer;
})();

