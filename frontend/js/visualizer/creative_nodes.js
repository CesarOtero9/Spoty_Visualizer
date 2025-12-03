// js/visualizer/creative_nodes.js
// SISTEMA DE NODOS CREATIVO - REACCIONA A MÚSICA Y COLORES DE ÁLBUM

(function () {
    "use strict";

    class CreativeNode {
        constructor(id, width, height, params) {
            this.id = id;
            this.type = this.determineNodeType(params);
            this.reset(width, height, params);
            this.initTrail();
            this.initLifecycle();
            this.initPersonality(params);
        }

        determineNodeType(params) {
            const behaviors = params.behaviors || [];
            const energy = params.energy || 0.5;

            if (behaviors.includes("energetic") && energy > 0.7) {
                return "pulse";
            } else if (behaviors.includes("dancing")) {
                return "dancer";
            } else if (behaviors.includes("melancholic")) {
                return "float";
            } else if (behaviors.includes("instrumental")) {
                return "orbital";
            } else if (behaviors.includes("organic")) {
                return "organic";
            } else {
                return "standard";
            }
        }

        reset(width, height, params) {
            // Posición inicial basada en tipo
            switch(this.type) {
                case "pulse":
                    this.x = width * (0.3 + Math.random() * 0.4);
                    this.y = height * (0.3 + Math.random() * 0.4);
                    break;
                case "dancer":
                    this.x = width * 0.5;
                    this.y = height * 0.5;
                    break;
                case "orbital":
                    const angle = Math.random() * Math.PI * 2;
                    const distance = width * 0.3;
                    this.x = width * 0.5 + Math.cos(angle) * distance;
                    this.y = height * 0.5 + Math.sin(angle) * distance;
                    break;
                default:
                    this.x = Math.random() * width;
                    this.y = Math.random() * height;
            }

            // Propiedades físicas
            this.vx = (Math.random() - 0.5) * params.movementSpeed * 0.2;
            this.vy = (Math.random() - 0.5) * params.movementSpeed * 0.2;
            this.baseSize = params.baseSize * (0.7 + Math.random() * 0.6);
            this.size = this.baseSize;

            // Propiedades de personalidad
            this.responsiveness = 0.5 + Math.random() * 0.5; // 0.5-1.0
            this.chaosFactor = Math.random() * 0.3;
            this.socialTendency = 0.3 + Math.random() * 0.7;

            // Estado
            this.pulsePhase = Math.random() * Math.PI * 2;
            this.pulseSpeed = 2 + Math.random() * 3;
            this.spin = (Math.random() - 0.5) * 0.1;
            this.angle = Math.random() * Math.PI * 2;

            // Conexiones
            this.connections = [];
            this.maxConnections = 3 + Math.floor(Math.random() * 4);
            this.connectionStrength = 0;
        }

        initTrail() {
            this.trail = [];
            this.maxTrailLength = 8 + Math.floor(Math.random() * 12);
            this.trailDecay = 0.85 + Math.random() * 0.1;
        }

        initLifecycle() {
            this.life = 1.0;
            this.energy = 0.8 + Math.random() * 0.2;
            this.decayRate = 0.995 + Math.random() * 0.004;
            this.rebirthThreshold = 0.2;
        }

        initPersonality(params) {
            // Colores basados en paleta del álbum
            const palette = params.colorPalette || ["#22c55e", "#3b82f6", "#a855f7"];
            const colorIndex = Math.floor(Math.random() * palette.length);
            this.baseColor = palette[colorIndex];

            // Convertir hex a HSL para variaciones
            this.hslColor = this.hexToHSL(this.baseColor);

            // Variación de color según tipo de nodo
            switch(this.type) {
                case "pulse":
                    this.hslColor[0] = (this.hslColor[0] + 30) % 360; // Shift hue
                    this.hslColor[1] = Math.min(100, this.hslColor[1] * 1.3); // Más saturado
                    break;
                case "dancer":
                    this.hslColor[2] = Math.min(100, this.hslColor[2] * 1.2); // Más claro
                    break;
                case "float": // Cambiado de "melancholic" a "float" para coincidir con determineNodeType
                    this.hslColor[1] = this.hslColor[1] * 0.7; // Menos saturado
                    this.hslColor[2] = this.hslColor[2] * 0.8; // Más oscuro
                    break;
            }

            this.color = this.HSLtoString(this.hslColor);
            this.glowColor = this.HSLtoString([
                this.hslColor[0],
                Math.min(100, this.hslColor[1] * 1.2),
                Math.min(100, this.hslColor[2] * 1.3)
            ]);

            // Opacidad dinámica
            this.baseAlpha = 0.6 + Math.random() * 0.3;
            this.alpha = this.baseAlpha;
        }

        hexToHSL(hex) {
            // Convertir hex a RGB
            let r = parseInt(hex.slice(1, 3), 16) / 255;
            let g = parseInt(hex.slice(3, 5), 16) / 255;
            let b = parseInt(hex.slice(5, 7), 16) / 255;

            // Convertir RGB a HSL
            let max = Math.max(r, g, b);
            let min = Math.min(r, g, b);
            let h, s, l = (max + min) / 2;

            if (max === min) {
                h = s = 0;
            } else {
                let d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

                switch (max) {
                    case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                    case g: h = (b - r) / d + 2; break;
                    case b: h = (r - g) / d + 4; break;
                }
                h /= 6;
            }

            return [h * 360, s * 100, l * 100];
        }

        HSLtoString(hsl) {
            return `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`;
        }

        update(dt, width, height, params, audioFeatures, attractionPoints, time) {
            const energy = audioFeatures.energy || 0.5;
            const tempo = audioFeatures.tempo || 120;
            const dance = audioFeatures.danceability || 0.5;
            const valence = audioFeatures.valence || 0.5;
            const speech = audioFeatures.speechiness || 0.1;
            const instrumental = audioFeatures.instrumentalness || 0;
            const acoustic = audioFeatures.acousticness || 0.5;
            const liveness = audioFeatures.liveness || 0.2;
            const key = audioFeatures.key || 0;
            const mode = audioFeatures.mode || 1;

            // Actualizar ciclo de vida
            this.life *= this.decayRate;
            if (this.life < this.rebirthThreshold) {
                this.reset(width, height, params);
                this.life = 1.0;
            }

            // Actualizar trail
            this.updateTrail();

            // MOVIMIENTO INTELIGENTE BASADO EN TIPO
            switch(this.type) {
                case "pulse":
                    this.updatePulseMovement(dt, width, height, params, energy, tempo, time);
                    break;
                case "dancer":
                    this.updateDancerMovement(dt, width, height, params, dance, tempo, time);
                    break;
                case "float":
                    this.updateFloatMovement(dt, width, height, params, valence, acoustic, time);
                    break;
                case "orbital":
                    this.updateOrbitalMovement(dt, width, height, params, instrumental, key, time);
                    break;
                case "organic":
                    this.updateOrganicMovement(dt, width, height, params, acoustic, liveness, time);
                    break;
                default:
                    this.updateStandardMovement(dt, width, height, params, energy, speech, time);
            }

            // Aplicar puntos de atracción
            this.applyAttractionForces(attractionPoints, width, height, energy);

            // Aplicar bordes con comportamiento inteligente
            this.handleBoundaries(width, height, params, energy);

            // Actualizar propiedades visuales
            this.updateVisualProperties(dt, audioFeatures, time);

            // Actualizar rotación
            this.angle += this.spin * dt * (1 + energy * 2);
        }

        updatePulseMovement(dt, width, height, params, energy, tempo, time) {
            // Movimiento pulsante rítmico
            const beatTime = time * (tempo / 60);
            const pulse = Math.sin(beatTime * Math.PI * 2 + this.pulsePhase) * 0.5 + 0.5;

            // Movimiento hacia afuera en pulsos
            const pulseForce = pulse * energy * 20 * dt;
            const angle = Math.atan2(this.y - height/2, this.x - width/2);

            this.vx += Math.cos(angle) * pulseForce;
            this.vy += Math.sin(angle) * pulseForce;

            // Movimiento aleatorio controlado
            const chaos = (Math.random() - 0.5) * 10 * energy * dt;
            this.vx += chaos;
            this.vy += chaos;

            // Aplicar velocidad
            this.vx *= 0.95;
            this.vy *= 0.95;

            this.x += this.vx * dt * params.movementSpeed;
            this.y += this.vy * dt * params.movementSpeed;

            // Tamaño pulsante
            this.size = this.baseSize * (0.8 + pulse * 0.4);
        }

        updateDancerMovement(dt, width, height, params, dance, tempo, time) {
            // Movimiento de baile en patrones
            const dancePattern = Math.sin(time * 2 + this.x * 0.01) * dance * 30;
            const rhythm = Math.sin(time * (tempo / 60) + this.y * 0.01) * 20;

            // Movimiento en figura 8
            const lissajousX = Math.sin(time * 1.5 + this.id * 0.1) * width * 0.2;
            const lissajousY = Math.sin(time * 2 + this.id * 0.1) * height * 0.15;

            this.vx = (lissajousX - this.x) * 0.02 + dancePattern * dt;
            this.vy = (lissajousY - this.y) * 0.02 + rhythm * dt;

            this.x += this.vx;
            this.y += this.vy;

            // Girar mientras baila
            this.spin = 0.05 + dance * 0.1;
        }

        updateFloatMovement(dt, width, height, params, valence, acoustic, time) {
            // Movimiento suave y flotante
            const waveX = Math.sin(time * 0.5 + this.x * 0.005) * 10 * (1 - valence);
            const waveY = Math.cos(time * 0.7 + this.y * 0.005) * 8 * acoustic;

            // Deriva suave
            this.vx = this.vx * 0.98 + waveX * dt;
            this.vy = this.vy * 0.98 + waveY * dt;

            // Movimiento muy lento
            this.x += this.vx * dt * params.movementSpeed * 0.5;
            this.y += this.vy * dt * params.movementSpeed * 0.5;

            // Tamaño variable suave
            const sizeWave = Math.sin(time * 1 + this.id * 0.05) * 0.2 + 0.8;
            this.size = this.baseSize * sizeWave * (0.7 + valence * 0.3);
        }

        updateOrbitalMovement(dt, width, height, params, instrumental, key, time) {
            // Movimiento orbital alrededor de puntos
            const centerX = width * 0.5;
            const centerY = height * 0.5;

            const dx = this.x - centerX;
            const dy = this.y - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);

            // Fuerza orbital basada en instrumentalness
            const orbitalSpeed = 0.02 + instrumental * 0.03;
            const newAngle = angle + orbitalSpeed * dt * (1 + key * 0.1);

            // Radio variable
            const targetRadius = width * 0.25 + (this.id % 5) * 20;
            const radiusError = targetRadius - distance;

            this.x = centerX + Math.cos(newAngle) * (distance + radiusError * 0.1);
            this.y = centerY + Math.sin(newAngle) * (distance + radiusError * 0.1);

            // Movimiento en espiral suave
            const spiral = instrumental * 0.1;
            this.x += Math.cos(time * 0.3) * spiral;
            this.y += Math.sin(time * 0.3) * spiral;
        }

        updateOrganicMovement(dt, width, height, params, acoustic, liveness, time) {
            // Movimiento orgánico, como vida natural
            const noiseX = this.perlinNoise(time * 0.5, this.id * 0.1) * 20 * acoustic;
            const noiseY = this.perlinNoise(time * 0.5, this.id * 0.1 + 0.5) * 15 * acoustic;

            // Movimiento browniano suave
            this.vx = this.vx * 0.96 + noiseX * dt;
            this.vy = this.vy * 0.96 + noiseY * dt;

            // Efecto de "respiración" con liveness
            const breath = Math.sin(time * 0.3) * 0.1 + 0.9;
            const livenessEffect = 1 + liveness * 0.3;

            this.x += this.vx * dt * params.movementSpeed * breath;
            this.y += this.vy * dt * params.movementSpeed * breath;

            // Tamaño que "respira"
            this.size = this.baseSize * breath * livenessEffect;
        }

        updateStandardMovement(dt, width, height, params, energy, speech, time) {
            // Movimiento estándar con influencia de audio
            const chaos = (Math.random() - 0.5) * 15 * energy * speech * dt;
            const waveX = Math.sin(time * 2) * 8 * energy;
            const waveY = Math.cos(time * 1.7) * 6 * energy;

            this.vx = this.vx * 0.92 + (waveX + chaos) * dt;
            this.vy = this.vy * 0.92 + (waveY + chaos) * dt;

            this.x += this.vx * dt * params.movementSpeed;
            this.y += this.vy * dt * params.movementSpeed;
        }

        perlinNoise(x, y) {
            // Simulación simple de ruido Perlin
            function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
            function lerp(t, a, b) { return a + t * (b - a); }
            function grad(hash, x, y) {
                const h = hash & 15;
                const u = h < 8 ? x : y;
                const v = h < 4 ? y : h === 12 || h === 14 ? x : 0;
                return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
            }

            const X = Math.floor(x) & 255;
            const Y = Math.floor(y) & 255;
            x -= Math.floor(x);
            y -= Math.floor(y);

            const u = fade(x);
            const v = fade(y);

            const a = (Math.sin(X + Y * 57) * 43758.5453123) % 1;
            const b = (Math.sin((X + 1) + Y * 57) * 43758.5453123) % 1;
            const c = (Math.sin(X + (Y + 1) * 57) * 43758.5453123) % 1;
            const d = (Math.sin((X + 1) + (Y + 1) * 57) * 43758.5453123) % 1;

            return lerp(v, lerp(u, a, b), lerp(u, c, d));
        }

        applyAttractionForces(attractionPoints, width, height, energy) {
            if (!attractionPoints || attractionPoints.length === 0) return;

            // Aplicar fuerza de cada punto de atracción
            for (const point of attractionPoints) {
                const px = point.x * width;
                const py = point.y * height;
                const dx = px - this.x;
                const dy = py - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Solo aplicar si está dentro del radio
                if (distance < point.radius * Math.min(width, height)) {
                    const force = point.strength * (1 - distance / (point.radius * Math.min(width, height)));
                    const forceMultiplier = force * 0.1 * energy;

                    this.vx += (dx / (distance + 1)) * forceMultiplier;
                    this.vy += (dy / (distance + 1)) * forceMultiplier;

                    // Comportamiento especial según tipo de punto
                    if (point.type === "beat") {
                        // Pulso rítmico en beats
                        this.size = this.baseSize * (1 + force * 0.3);
                    }
                }
            }
        }

        handleBoundaries(width, height, params, energy) {
            const bounceIntensity = params.bounceIntensity || 0.8;
            const edgeBehavior = this.determineEdgeBehavior();

            if (this.x < 0) {
                switch(edgeBehavior) {
                    case "bounce":
                        this.vx = Math.abs(this.vx) * bounceIntensity * (0.8 + energy * 0.4);
                        break;
                    case "wrap":
                        this.x = width;
                        break;
                    case "attract":
                        this.vx += 5 * (1 + energy);
                        break;
                }
                this.x = Math.max(0, this.x);
                this.onEdgeCollision();
            }

            if (this.x > width) {
                switch(edgeBehavior) {
                    case "bounce":
                        this.vx = -Math.abs(this.vx) * bounceIntensity * (0.8 + energy * 0.4);
                        break;
                    case "wrap":
                        this.x = 0;
                        break;
                    case "attract":
                        this.vx -= 5 * (1 + energy);
                        break;
                }
                this.x = Math.min(width, this.x);
                this.onEdgeCollision();
            }

            if (this.y < 0) {
                switch(edgeBehavior) {
                    case "bounce":
                        this.vy = Math.abs(this.vy) * bounceIntensity * (0.8 + energy * 0.4);
                        break;
                    case "wrap":
                        this.y = height;
                        break;
                    case "attract":
                        this.vy += 5 * (1 + energy);
                        break;
                }
                this.y = Math.max(0, this.y);
                this.onEdgeCollision();
            }

            if (this.y > height) {
                switch(edgeBehavior) {
                    case "bounce":
                        this.vy = -Math.abs(this.vy) * bounceIntensity * (0.8 + energy * 0.4);
                        break;
                    case "wrap":
                        this.y = 0;
                        break;
                    case "attract":
                        this.vy -= 5 * (1 + energy);
                        break;
                }
                this.y = Math.min(height, this.y);
                this.onEdgeCollision();
            }
        }

        determineEdgeBehavior() {
            const behaviors = ["bounce", "wrap", "attract"];
            const weights = [0.6, 0.3, 0.1];

            let sum = 0;
            const rand = Math.random();

            for (let i = 0; i < behaviors.length; i++) {
                sum += weights[i];
                if (rand <= sum) {
                    return behaviors[i];
                }
            }

            return "bounce";
        }

        onEdgeCollision() {
            // Cambiar color ligeramente en colisión
            this.hslColor[0] = (this.hslColor[0] + 5) % 360;
            this.color = this.HSLtoString(this.hslColor);

            // Aumentar energía temporalmente
            this.energy = Math.min(1.0, this.energy * 1.1);
        }

        updateTrail() {
            // Añadir punto actual al trail
            this.trail.push({x: this.x, y: this.y, size: this.size, alpha: this.alpha});

            // Limitar longitud del trail
            if (this.trail.length > this.maxTrailLength) {
                this.trail.shift();
            }

            // Decaer trail
            for (let i = 0; i < this.trail.length; i++) {
                this.trail[i].alpha *= this.trailDecay;
                this.trail[i].size *= 0.95;
            }
        }

        updateVisualProperties(dt, audioFeatures, time) {
            const energy = audioFeatures.energy || 0.5;
            const valence = audioFeatures.valence || 0.5;
            const dance = audioFeatures.danceability || 0.5;

            // Actualizar alpha basado en energía y vida
            this.alpha = this.baseAlpha * this.life * (0.7 + energy * 0.3);

            // Cambio de color sutil basado en valence
            const hueShift = Math.sin(time * 0.5) * 10 * valence;
            this.hslColor[0] = (this.hslColor[0] + hueShift * dt) % 360;

            // Saturación basada en danceability
            this.hslColor[1] = Math.min(100, this.hslColor[1] * (0.8 + dance * 0.4));

            // Luminosidad basada en energía
            this.hslColor[2] = Math.min(100, this.hslColor[2] * (0.7 + energy * 0.6));

            this.color = this.HSLtoString(this.hslColor);

            // Glow más intenso con alta energía
            this.glowColor = this.HSLtoString([
                this.hslColor[0],
                Math.min(100, this.hslColor[1] * 1.3),
                Math.min(100, this.hslColor[2] * 1.4)
            ]);
        }

        draw(ctx) {
            // Dibujar trail primero (detrás del nodo)
            if (this.trail.length > 1) {
                this.drawTrail(ctx);
            }

            // Dibujar nodo principal
            this.drawNode(ctx);

            // Dibujar glow/aura
            if (this.energy > 0.5) {
                this.drawAura(ctx);
            }
        }

        drawTrail(ctx) {
            ctx.save();

            // Dibujar líneas del trail
            for (let i = 0; i < this.trail.length - 1; i++) {
                const point = this.trail[i];
                const nextPoint = this.trail[i + 1];

                // Gradiente de color en el trail
                const gradient = ctx.createLinearGradient(
                    point.x, point.y,
                    nextPoint.x, nextPoint.y
                );

                gradient.addColorStop(0, `hsla(${this.hslColor[0]}, ${this.hslColor[1]}%, ${this.hslColor[2]}%, ${point.alpha * 0.3})`);
                gradient.addColorStop(1, `hsla(${this.hslColor[0]}, ${this.hslColor[1]}%, ${this.hslColor[2]}%, ${nextPoint.alpha * 0.1})`);

                ctx.strokeStyle = gradient;
                ctx.lineWidth = point.size * 0.5;
                ctx.lineCap = 'round';

                ctx.beginPath();
                ctx.moveTo(point.x, point.y);
                ctx.lineTo(nextPoint.x, nextPoint.y);
                ctx.stroke();
            }

            // Dibujar puntos del trail
            for (let i = 0; i < this.trail.length; i++) {
                const point = this.trail[i];

                ctx.fillStyle = `hsla(${this.hslColor[0]}, ${this.hslColor[1]}%, ${this.hslColor[2]}%, ${point.alpha * 0.5})`;
                ctx.beginPath();
                ctx.arc(point.x, point.y, point.size * 0.3, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }

        drawNode(ctx) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);

            // Sombra/glow
            ctx.shadowColor = this.glowColor;
            ctx.shadowBlur = this.size * 3 * this.energy;

            // Forma del nodo basada en tipo
            switch(this.type) {
                case "pulse":
                    this.drawPulseNode(ctx);
                    break;
                case "dancer":
                    this.drawDancerNode(ctx);
                    break;
                case "organic":
                    this.drawOrganicNode(ctx);
                    break;
                default:
                    this.drawStandardNode(ctx);
            }

            ctx.shadowBlur = 0;
            ctx.restore();
        }

        drawPulseNode(ctx) {
            // Nodo pulsante con anillos
            const ringCount = 3;
            const maxRingSize = this.size * 2.5;

            for (let i = ringCount; i >= 0; i--) {
                const ringSize = this.size + (i * this.size * 0.5);
                const ringAlpha = (0.3 / (i + 1)) * this.alpha * this.energy;

                ctx.strokeStyle = `hsla(${this.hslColor[0]}, ${this.hslColor[1]}%, ${this.hslColor[2]}%, ${ringAlpha})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(0, 0, ringSize, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Núcleo brillante
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
            gradient.addColorStop(0, `hsla(${this.hslColor[0]}, ${this.hslColor[1]}%, ${this.hslColor[2] + 20}%, ${this.alpha})`);
            gradient.addColorStop(1, `hsla(${this.hslColor[0]}, ${this.hslColor[1]}%, ${this.hslColor[2]}%, ${this.alpha * 0.3})`);

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, this.size, 0, Math.PI * 2);
            ctx.fill();
        }

        drawDancerNode(ctx) {
            // Nodo bailarín con forma estelar
            const points = 6;
            const innerRadius = this.size * 0.6;
            const outerRadius = this.size * 1.2;

            // Gradiente radial
            const gradient = ctx.createRadialGradient(0, 0, innerRadius, 0, 0, outerRadius);
            gradient.addColorStop(0, `hsla(${this.hslColor[0]}, ${this.hslColor[1]}%, ${this.hslColor[2] + 30}%, ${this.alpha})`);
            gradient.addColorStop(1, `hsla(${this.hslColor[0]}, ${this.hslColor[1]}%, ${this.hslColor[2]}%, ${this.alpha * 0.5})`);

            ctx.fillStyle = gradient;
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

            // Centro brillante
            ctx.fillStyle = `hsla(${this.hslColor[0]}, ${this.hslColor[1]}%, ${this.hslColor[2] + 40}%, ${this.alpha})`;
            ctx.beginPath();
            ctx.arc(0, 0, this.size * 0.4, 0, Math.PI * 2);
            ctx.fill();
        }

        drawOrganicNode(ctx) {
            // Nodo orgánico con forma irregular
            const irregularity = 0.3;
            const points = 8;

            ctx.fillStyle = `hsla(${this.hslColor[0]}, ${this.hslColor[1]}%, ${this.hslColor[2]}%, ${this.alpha})`;
            ctx.beginPath();

            for (let i = 0; i < points; i++) {
                const angle = (i / points) * Math.PI * 2;
                const radius = this.size * (1 + (Math.random() - 0.5) * irregularity);
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;

                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }

            ctx.closePath();
            ctx.fill();

            // Detalles internos
            ctx.fillStyle = `hsla(${this.hslColor[0]}, ${this.hslColor[1]}%, ${this.hslColor[2] + 20}%, ${this.alpha * 0.7})`;
            for (let i = 0; i < 3; i++) {
                const a = Math.random() * Math.PI * 2;
                const r = this.size * 0.3 * Math.random();
                const detailSize = this.size * 0.15;

                ctx.beginPath();
                ctx.arc(
                    Math.cos(a) * r,
                    Math.sin(a) * r,
                    detailSize,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
            }
        }

        drawStandardNode(ctx) {
            // Nodo estándar con gradiente
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
            gradient.addColorStop(0, `hsla(${this.hslColor[0]}, ${this.hslColor[1]}%, ${this.hslColor[2] + 20}%, ${this.alpha})`);
            gradient.addColorStop(0.7, `hsla(${this.hslColor[0]}, ${this.hslColor[1]}%, ${this.hslColor[2]}%, ${this.alpha * 0.8})`);
            gradient.addColorStop(1, `hsla(${this.hslColor[0]}, ${this.hslColor[1]}%, ${this.hslColor[2] - 10}%, ${this.alpha * 0.3})`);

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, this.size, 0, Math.PI * 2);
            ctx.fill();

            // Borde brillante
            ctx.strokeStyle = `hsla(${this.hslColor[0]}, ${this.hslColor[1]}%, ${this.hslColor[2] + 30}%, ${this.alpha * 0.8})`;
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        drawAura(ctx) {
            ctx.save();
            ctx.translate(this.x, this.y);

            // Aura difusa
            const auraSize = this.size * 3 * this.energy;
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, auraSize);
            gradient.addColorStop(0, `hsla(${this.hslColor[0]}, ${this.hslColor[1]}%, ${this.hslColor[2]}%, ${this.alpha * 0.3})`);
            gradient.addColorStop(1, `hsla(${this.hslColor[0]}, ${this.hslColor[1]}%, ${this.hslColor[2]}%, 0)`);

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, auraSize, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    }

    class CreativeNodesVisualizer {
        constructor(canvas, palette) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d', { alpha: true });
            this.width = canvas.clientWidth || 800;
            this.height = canvas.clientHeight || 400;
            this.canvas.width = this.width;
            this.canvas.height = this.height;

            this.nodes = [];
            this.connections = [];
            this.attractionPoints = [];

            this.params = {
                nodeCount: 80,
                baseSize: 3,
                movementSpeed: 25,
                connectionDistance: 120,
                connectionWidth: 0.8,
                bounceIntensity: 0.8,
                behaviors: ["balanced"]
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

            this.albumColors = palette || {
                dominant_hex: "#22c55e",
                palette_hex: ["#22c55e", "#3b82f6", "#a855f7"],
                color_mood: "balanced"
            };

            this.durationMs = 180000;
            this.progressMs = 0;
            this.isPlaying = false;

            this._lastTimestamp = null;
            this._rafId = null;
            this._time = 0;

            this._initNodes();
            this._initAttractionPoints();
        }

        _initNodes() {
            this.nodes = [];
            for (let i = 0; i < this.params.nodeCount; i++) {
                this.nodes.push(new CreativeNode(
                    i,
                    this.width,
                    this.height,
                    {
                        ...this.params,
                        colorPalette: this.albumColors.palette_hex,
                        energy: this.audioFeatures.energy,
                        danceability: this.audioFeatures.danceability,
                        valence: this.audioFeatures.valence
                    }
                ));
            }
            console.log(`🎮 ${this.nodes.length} nodos creativos inicializados`);
        }

        _initAttractionPoints() {
            this.attractionPoints = [
                { x: 0.5, y: 0.5, strength: 0.3, radius: 0.4, type: "center" },
                { x: 0.2, y: 0.2, strength: 0.2, radius: 0.2, type: "corner" },
                { x: 0.8, y: 0.2, strength: 0.2, radius: 0.2, type: "corner" },
                { x: 0.2, y: 0.8, strength: 0.2, radius: 0.2, type: "corner" },
                { x: 0.8, y: 0.8, strength: 0.2, radius: 0.2, type: "corner" }
            ];
        }

        setPalette(palette) {
            if (palette) {
                this.albumColors = palette;
                console.log("🎨 Paleta actualizada:", palette.color_mood);

                // Actualizar colores de nodos existentes
                this.nodes.forEach(node => {
                    if (palette.palette_hex) {
                        const colorIndex = Math.floor(Math.random() * palette.palette_hex.length);
                        node.baseColor = palette.palette_hex[colorIndex];
                        node.hslColor = node.hexToHSL(node.baseColor);
                        node.color = node.HSLtoString(node.hslColor);
                    }
                });
            }
        }

        resize(width, height) {
            this.width = width;
            this.height = height;
            this.canvas.width = width;
            this.canvas.height = height;

            // Recalcular posiciones manteniendo proporciones
            const scaleX = width / (this.canvas.width || width);
            const scaleY = height / (this.canvas.height || height);

            this.nodes.forEach(node => {
                node.x *= scaleX;
                node.y *= scaleY;
                node.vx *= scaleX;
                node.vy *= scaleY;
            });

            console.log(`🔄 Canvas redimensionado: ${width}x${height}`);
        }

        setTrackState({ audioFeatures, durationMs, progressMs, isPlaying, albumColors, movement_rules }) {
            // Actualizar audio features
            this.audioFeatures = Object.assign({}, this.audioFeatures, audioFeatures || {});

            if (durationMs) this.durationMs = durationMs;
            if (typeof progressMs === 'number') this.progressMs = progressMs;
            this.isPlaying = !!isPlaying;

            // Actualizar colores del álbum si están disponibles
            if (albumColors) {
                this.setPalette(albumColors);
            }

            // Actualizar reglas de movimiento si están disponibles
            if (movement_rules) {
                this.updateMovementRules(movement_rules);
            }

            // Calcular nuevos parámetros basados en audio features
            this.updateDynamicParams();

            // Ajustar número de nodos si es necesario
            this.adjustNodeCount();

            console.log("🎮 Estado actualizado - Nodos:", this.nodes.length);
        }

        updateDynamicParams() {
            const energy = this.audioFeatures.energy ?? 0.5;
            const dance = this.audioFeatures.danceability ?? 0.5;
            const valence = this.audioFeatures.valence ?? 0.5;
            const tempo = this.audioFeatures.tempo ?? 120;
            const acoustic = this.audioFeatures.acousticness ?? 0.5;
            const instrumental = this.audioFeatures.instrumentalness ?? 0;
            const speech = this.audioFeatures.speechiness ?? 0.1;
            const liveness = this.audioFeatures.liveness ?? 0.2;
            const loudness = this.audioFeatures.loudness ?? -10;

            // Parámetros dinámicos basados en audio features
            this.params.movementSpeed = 20 + energy * 60 + (tempo - 100) * 0.3;
            this.params.baseSize = 2 + dance * 3 + ((loudness + 60) / 20);
            this.params.connectionDistance = 80 + valence * 80 - acoustic * 40;
            this.params.bounceIntensity = 0.5 + liveness * 1.5;
            this.params.connectionWidth = 0.5 + speech * 1.5;

            // Determinar comportamientos
            this.params.behaviors = [];
            if (dance > 0.7) this.params.behaviors.push("dancing");
            if (energy > 0.8) this.params.behaviors.push("energetic");
            if (valence > 0.7) this.params.behaviors.push("happy");
            else if (valence < 0.3) this.params.behaviors.push("melancholic");
            if (acoustic > 0.7) this.params.behaviors.push("organic");
            if (instrumental > 0.7) this.params.behaviors.push("instrumental");
            if (liveness > 0.5) this.params.behaviors.push("live");
            if (speech > 0.5) this.params.behaviors.push("vocal");

            if (this.params.behaviors.length === 0) {
                this.params.behaviors = ["balanced"];
            }
        }

        updateMovementRules(movement_rules) {
            // Actualizar puntos de atracción basados en reglas
            if (movement_rules.attraction_points) {
                this.attractionPoints = movement_rules.attraction_points;
            }

            // Aplicar patrones rítmicos
            if (movement_rules.rhythmic_pattern === "dense") {
                this.params.movementSpeed *= 1.3;
            } else if (movement_rules.rhythmic_pattern === "sparse") {
                this.params.movementSpeed *= 0.7;
            }

            // Aplicar tipo de flujo
            switch(movement_rules.flow_type) {
                case "staccato":
                    this.params.bounceIntensity *= 1.5;
                    break;
                case "bouncy":
                    this.params.connectionDistance *= 1.2;
                    break;
                case "flowing":
                    this.params.movementSpeed *= 0.8;
                    break;
            }
        }

        adjustNodeCount() {
            const energy = this.audioFeatures.energy ?? 0.5;
            const tempo = this.audioFeatures.tempo ?? 120;
            const instrumental = this.audioFeatures.instrumentalness ?? 0;
            const speech = this.audioFeatures.speechiness ?? 0.1;

            // Calcular número objetivo de nodos
            let targetNodes = 80;
            targetNodes += energy * 40;
            targetNodes += (tempo - 100) * 0.5;
            targetNodes += instrumental * 30;
            targetNodes += speech * 20;

            targetNodes = Math.max(40, Math.min(200, Math.round(targetNodes)));

            // Ajustar si es necesario
            if (targetNodes !== this.nodes.length) {
                if (targetNodes > this.nodes.length) {
                    // Añadir nodos
                    const toAdd = targetNodes - this.nodes.length;
                    for (let i = 0; i < toAdd; i++) {
                        this.nodes.push(new CreativeNode(
                            this.nodes.length + i,
                            this.width,
                            this.height,
                            {
                                ...this.params,
                                colorPalette: this.albumColors.palette_hex,
                                energy: this.audioFeatures.energy,
                                danceability: this.audioFeatures.danceability,
                                valence: this.audioFeatures.valence
                            }
                        ));
                    }
                } else {
                    // Remover nodos (los menos energéticos)
                    const toRemove = this.nodes.length - targetNodes;
                    this.nodes.sort((a, b) => a.energy - b.energy);
                    this.nodes.splice(0, toRemove);

                    // Reasignar IDs
                    this.nodes.forEach((node, index) => {
                        node.id = index;
                    });
                }

                console.log(`🔄 Nodos ajustados: ${this.nodes.length} (objetivo: ${targetNodes})`);
            }
        }

        start() {
            if (this._rafId) return;
            this._lastTimestamp = performance.now();

            const loop = (timestamp) => {
                const dt = (timestamp - this._lastTimestamp) / 1000;
                this._lastTimestamp = timestamp;
                this._time += dt;

                this._update(dt);
                this._render();

                this._rafId = requestAnimationFrame(loop);
            };

            this._rafId = requestAnimationFrame(loop);
            console.log("🎮 Visualizador de nodos iniciado");
        }

        stop() {
            if (this._rafId) {
                cancelAnimationFrame(this._rafId);
                this._rafId = null;
                console.log("🎮 Visualizador de nodos detenido");
            }
        }

        _update(dt) {
            // Actualizar cada nodo
            this.nodes.forEach(node => {
                node.update(
                    dt,
                    this.width,
                    this.height,
                    this.params,
                    this.audioFeatures,
                    this.attractionPoints,
                    this._time
                );
            });

            // Calcular conexiones entre nodos
            this._updateConnections();
        }

        _updateConnections() {
            this.connections = [];
            const maxDistance = this.params.connectionDistance;

            for (let i = 0; i < this.nodes.length; i++) {
                const node1 = this.nodes[i];
                node1.connections = [];

                for (let j = i + 1; j < this.nodes.length; j++) {
                    const node2 = this.nodes[j];

                    // Calcular distancia
                    const dx = node1.x - node2.x;
                    const dy = node1.y - node2.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    // Si están lo suficientemente cerca
                    if (distance < maxDistance) {
                        // Calcular fuerza de conexión (inversa a la distancia)
                        const strength = 1 - (distance / maxDistance);

                        // Solo conectar si hay "afinidad"
                        const affinity = this._calculateAffinity(node1, node2, distance);

                        if (affinity > 0.3 && node1.connections.length < node1.maxConnections) {
                            this.connections.push({
                                node1: node1,
                                node2: node2,
                                distance: distance,
                                strength: strength * affinity,
                                color1: node1.color,
                                color2: node2.color
                            });

                            node1.connections.push(node2);
                            node2.connections.push(node1);
                        }
                    }
                }
            }
        }

        _calculateAffinity(node1, node2, distance) {
            // Afinidad basada en:
            // 1. Similitud de tipo
            const typeAffinity = node1.type === node2.type ? 0.8 : 0.3;

            // 2. Similitud de color (en HSL)
            const hueDiff = Math.abs(node1.hslColor[0] - node2.hslColor[0]);
            const colorAffinity = 1 - (Math.min(hueDiff, 360 - hueDiff) / 180);

            // 3. Distancia (ya normalizada)
            const distanceAffinity = 1 - (distance / this.params.connectionDistance);

            // 4. Comportamiento social
            const socialAffinity = (node1.socialTendency + node2.socialTendency) / 2;

            // Combinar factores
            return (typeAffinity * 0.3 +
                   colorAffinity * 0.3 +
                   distanceAffinity * 0.2 +
                   socialAffinity * 0.2);
        }

        _render() {
            const ctx = this.ctx;
            const w = this.width;
            const h = this.height;

            // Fondo con gradiente basado en colores del álbum
            this._renderBackground(ctx, w, h);

            // Renderizar conexiones primero (detrás de los nodos)
            this._renderConnections(ctx);

            // Renderizar nodos
            this.nodes.forEach(node => {
                node.draw(ctx);
            });

            // Efectos especiales basados en audio
            this._renderAudioEffects(ctx, w, h);
        }

        _renderBackground(ctx, w, h) {
            // Crear gradiente basado en colores del álbum
            const gradient = ctx.createLinearGradient(0, 0, w, h);

            if (this.albumColors.background_gradient && this.albumColors.background_gradient.length >= 2) {
                gradient.addColorStop(0, this.albumColors.background_gradient[0] + "20");
                gradient.addColorStop(0.5, this.albumColors.background_gradient[1] + "10");
                gradient.addColorStop(1, this.albumColors.background_gradient[2] + "05");
            } else {
                // Gradiente por defecto
                gradient.addColorStop(0, "rgba(15, 23, 42, 0.3)");
                gradient.addColorStop(1, "rgba(2, 6, 23, 0.1)");
            }

            // Fondo base
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, w, h);

            // Patrón de puntos sutiles
            if (this.audioFeatures.energy > 0.3) {
                this._renderBackgroundPattern(ctx, w, h);
            }
        }

        _renderBackgroundPattern(ctx, w, h) {
            const energy = this.audioFeatures.energy ?? 0.5;
            const count = Math.floor(energy * 20);
            const size = 1 + energy * 3;

            ctx.save();
            ctx.globalAlpha = 0.05 + energy * 0.1;

            for (let i = 0; i < count; i++) {
                const x = Math.random() * w;
                const y = Math.random() * h;
                const alpha = 0.1 + Math.random() * 0.2;

                if (this.albumColors.dominant_hex) {
                    ctx.fillStyle = this.albumColors.dominant_hex + Math.floor(alpha * 255).toString(16).padStart(2, '0');
                } else {
                    ctx.fillStyle = `rgba(34, 197, 94, ${alpha})`;
                }

                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }

        _renderConnections(ctx) {
            const energy = this.audioFeatures.energy ?? 0.5;
            const dance = this.audioFeatures.danceability ?? 0.5;

            this.connections.forEach(conn => {
                // Ancho de línea basado en fuerza y energía
                const lineWidth = this.params.connectionWidth * conn.strength * (0.8 + energy * 0.4);
                ctx.lineWidth = lineWidth;

                // Gradiente de color entre los dos nodos
                const gradient = ctx.createLinearGradient(
                    conn.node1.x, conn.node1.y,
                    conn.node2.x, conn.node2.y
                );

                gradient.addColorStop(0, conn.color1.replace(')', `, ${conn.strength * 0.5})`));
                gradient.addColorStop(1, conn.color2.replace(')', `, ${conn.strength * 0.3})`));

                ctx.strokeStyle = gradient;
                ctx.lineCap = 'round';

                // Dibujar línea de conexión
                ctx.beginPath();
                ctx.moveTo(conn.node1.x, conn.node1.y);
                ctx.lineTo(conn.node2.x, conn.node2.y);
                ctx.stroke();

                // Punto de conexión en el medio (para conexiones fuertes)
                if (conn.strength > 0.7) {
                    const midX = (conn.node1.x + conn.node2.x) / 2;
                    const midY = (conn.node1.y + conn.node2.y) / 2;

                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(midX, midY, lineWidth * 0.8, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Efecto de pulso en conexiones con alta energía
                if (energy > 0.6 && conn.strength > 0.5) {
                    const pulse = Math.sin(this._time * 5) * 0.5 + 0.5;
                    ctx.shadowColor = conn.color1;
                    ctx.shadowBlur = lineWidth * 3 * pulse;
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                }
            });
        }

        _renderAudioEffects(ctx, w, h) {
            const energy = this.audioFeatures.energy ?? 0.5;
            const tempo = this.audioFeatures.tempo ?? 120;
            const valence = this.audioFeatures.valence ?? 0.5;

            // Ondas de energía desde el centro
            if (energy > 0.4) {
                const waveCount = Math.floor(energy * 3);
                const beatTime = this._time * (tempo / 60);

                for (let i = 0; i < waveCount; i++) {
                    const radius = (w * 0.5) * (0.2 + (Math.sin(beatTime + i) * 0.5 + 0.5) * 0.8);
                    const alpha = 0.05 * (1 - (i / waveCount));

                    ctx.strokeStyle = this.albumColors.dominant_hex
                        ? this.albumColors.dominant_hex + Math.floor(alpha * 255).toString(16).padStart(2, '0')
                        : `rgba(34, 197, 94, ${alpha})`;

                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.arc(w/2, h/2, radius, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }

            // Partículas de energía flotando
            if (energy > 0.5) {
                this._renderEnergyParticles(ctx, w, h, energy, valence);
            }
        }

        _renderEnergyParticles(ctx, w, h, energy, valence) {
            const particleCount = Math.floor(energy * 10);

            for (let i = 0; i < particleCount; i++) {
                const angle = this._time * 2 + i * 0.5;
                const distance = w * 0.3 + Math.sin(this._time + i) * w * 0.1;
                const x = w/2 + Math.cos(angle) * distance;
                const y = h/2 + Math.sin(angle) * distance;
                const size = 1 + Math.random() * energy * 3;
                const alpha = 0.2 + Math.random() * 0.3;

                // Color basado en valence
                let color;
                if (valence > 0.7) {
                    color = `rgba(255, 215, 0, ${alpha})`; // Dorado para felicidad
                } else if (valence < 0.3) {
                    color = `rgba(100, 100, 255, ${alpha})`; // Azul para melancolía
                } else if (this.albumColors.accent_color) {
                    color = this.albumColors.accent_color.replace(')', `, ${alpha})`);
                } else {
                    color = `rgba(34, 197, 94, ${alpha})`;
                }

                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();

                // Traza sutil
                ctx.strokeStyle = color.replace(')', ', 0.1)');
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.arc(x, y, size * 2, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }

    // Exportar al ámbito global
    window.CreativeNodesVisualizer = CreativeNodesVisualizer;

    // Alias para compatibilidad
    window.ParticlesVisualizer = CreativeNodesVisualizer;

    console.log("🎮 CreativeNodesVisualizer cargado ✅");
})();