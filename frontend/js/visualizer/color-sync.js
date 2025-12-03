// js/visualizer/color-sync.js
// SISTEMA MEJORADO DE COLORES Y PALETAS

(function () {
    "use strict";

    class EnhancedColorSync {
        constructor() {
            console.log("🎨 EnhancedColorSync inicializado");
            this.currentMood = "balanced";
            this.currentPalette = null;
        }

        // ================== EXTRACCIÓN DE COLORES ==================

        applyAlbumColors(containerEl, albumColors) {
            if (!containerEl || !albumColors) {
                console.warn("🎨 No hay colores de álbum para aplicar");
                return;
            }

            const dominantColor = albumColors.dominant_hex || "#22c55e";
            const palette = albumColors.palette_hex || [dominantColor];
            const mood = albumColors.color_mood || "balanced";
            const vibrancy = albumColors.color_vibrancy || "medium";

            console.log(`🎨 Aplicando colores - Mood: ${mood}, Vibrancy: ${vibrancy}`);

            // Guardar referencia
            this.currentMood = mood;
            this.currentPalette = {
                dominant: dominantColor,
                palette: palette,
                mood: mood,
                vibrancy: vibrancy,
                allData: albumColors
            };

            // Crear gradiente complejo basado en colores del álbum
            let gradientCSS;

            if (palette.length >= 3) {
                // Usar paleta completa para gradiente
                gradientCSS = `
                    radial-gradient(circle at 10% 10%, ${palette[0]}40 0%, transparent 40%),
                    radial-gradient(circle at 90% 10%, ${palette[1]}30 0%, transparent 40%),
                    radial-gradient(circle at 10% 90%, ${palette[2]}20 0%, transparent 45%),
                    radial-gradient(circle at 90% 90%, ${palette.length > 3 ? palette[3] : dominantColor}15 0%, transparent 50%),
                    radial-gradient(circle at center, ${this._getMoodBackground(mood)} 0%, ${this._getMoodBackground(mood, true)} 100%)
                `;
            } else {
                // Gradiente simple con color dominante
                gradientCSS = `
                    radial-gradient(circle at 20% 20%, ${dominantColor}30 0%, transparent 50%),
                    radial-gradient(circle at 80% 80%, ${dominantColor}20 0%, transparent 55%),
                    radial-gradient(circle at center, ${this._getMoodBackground(mood)} 0%, ${this._getMoodBackground(mood, true)} 100%)
                `;
            }

            // Aplicar al contenedor
            containerEl.style.background = gradientCSS;
            containerEl.style.transition = "background 1.5s cubic-bezier(0.4, 0, 0.2, 1)";

            // Añadir clase según mood
            this._applyMoodClass(containerEl, mood);

            // Aplicar colores a elementos de la UI
            this._applyColorsToUI(albumColors);

            console.log(`🎨 Colores aplicados exitosamente - Mood: ${mood}`);
        }

        _getMoodBackground(mood, isSecondary = false) {
            const backgrounds = {
                "fiery": isSecondary ? "#0f172a" : "#1c1917",
                "sunny": isSecondary ? "#0f172a" : "#1e293b",
                "verdant": isSecondary ? "#020617" : "#064e3b",
                "oceanic": isSecondary ? "#020617" : "#0f172a",
                "deep_blue": isSecondary ? "#020617" : "#1e1b4b",
                "mystic": isSecondary ? "#0f172a" : "#1e1b4b",
                "ethereal": isSecondary ? "#0f172a" : "#1e293b",
                "noir": isSecondary ? "#020617" : "#000000",
                "monochrome": isSecondary ? "#111827" : "#1f2937",
                "vibrant": isSecondary ? "#020617" : "#1e293b",
                "party": isSecondary ? "#022c22" : "#052e16",
                "chill": isSecondary ? "#0f172a" : "#1d263b",
                "dark": isSecondary ? "#020617" : "#111827",
                "epic": isSecondary ? "#052e16" : "#0f172a",
                "balanced": isSecondary ? "#020617" : "#0f172a",
                "default": isSecondary ? "#020617" : "#0f172a"
            };

            return backgrounds[mood] || backgrounds["default"];
        }

        _applyMoodClass(containerEl, mood) {
            // Limpiar clases previas
            containerEl.className = containerEl.className
                .replace(/\bcolor-mood-\w+\b/g, '')
                .replace(/\bvibrancy-\w+\b/g, '');

            // Añadir nuevas clases
            containerEl.classList.add(`color-mood-${mood}`);

            // Añadir clase de vibrancy si está disponible
            if (this.currentPalette && this.currentPalette.vibrancy) {
                containerEl.classList.add(`vibrancy-${this.currentPalette.vibrancy}`);
            }
        }

        _applyColorsToUI(albumColors) {
            // Aplicar colores a elementos específicos de la UI
            setTimeout(() => {
                const dominantColor = albumColors.dominant_hex || "#22c55e";
                const textColor = albumColors.suggested_text_color || "#ffffff";

                // Aplicar a botones
                const buttons = document.querySelectorAll('.ui-btn--primary, .now-playing-card');
                buttons.forEach(btn => {
                    if (btn.classList.contains('now-playing-card')) {
                        btn.style.background = `
                            radial-gradient(circle at top left, ${dominantColor}20 0%, transparent 50%),
                            radial-gradient(circle at bottom right, ${dominantColor}15 0%, transparent 55%),
                            rgba(15, 23, 42, 0.95)
                        `;
                        btn.style.borderColor = `${dominantColor}40`;
                    } else {
                        btn.style.background = `radial-gradient(circle at top, ${dominantColor} 0%, ${this._darkenColor(dominantColor, 20)} 60%, ${this._darkenColor(dominantColor, 40)} 100%)`;
                        btn.style.borderColor = `${dominantColor}70`;
                    }
                });

                // Aplicar a títulos
                const titles = document.querySelectorAll('.ui-section-title__main, .app-main__title');
                titles.forEach(title => {
                    title.style.color = dominantColor;
                });

                // Aplicar a estado de conexión
                const status = document.getElementById('connection-status');
                if (status) {
                    status.style.color = dominantColor;
                }

                console.log("🎨 Colores aplicados a la UI");
            }, 100);
        }

        _darkenColor(hex, percent) {
            // Convertir hex a RGB
            let r = parseInt(hex.slice(1, 3), 16);
            let g = parseInt(hex.slice(3, 5), 16);
            let b = parseInt(hex.slice(5, 7), 16);

            // Oscurecer
            r = Math.floor(r * (100 - percent) / 100);
            g = Math.floor(g * (100 - percent) / 100);
            b = Math.floor(b * (100 - percent) / 100);

            // Convertir de nuevo a hex
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        }

        // ================== CLASIFICACIÓN DE MOOD ==================

        classifyMood(features, durationMs) {
            const energy = features.energy ?? 0.5;
            const dance = features.danceability ?? 0.5;
            const valence = features.valence ?? 0.5;
            const tempo = features.tempo ?? 120;
            const acoustic = features.acousticness ?? 0.5;
            const instrumental = features.instrumentalness ?? 0;
            const speech = features.speechiness ?? 0.1;
            const liveness = features.liveness ?? 0.2;
            const durationMin = (durationMs || 180000) / 60000;

            // Sistema de puntuación para determinar mood
            const scores = {
                "party": 0,
                "chill": 0,
                "dark": 0,
                "epic": 0,
                "vibrant": 0,
                "mystic": 0,
                "organic": 0
            };

            // Puntuar según características
            if (energy > 0.7) {
                scores.party += 3;
                scores.epic += 2;
                scores.vibrant += 1;
            }

            if (dance > 0.6) {
                scores.party += 2;
                scores.vibrant += 1;
            }

            if (valence > 0.7) {
                scores.vibrant += 2;
                scores.party += 1;
            } else if (valence < 0.3) {
                scores.dark += 3;
                scores.chill += 1;
            }

            if (tempo > 130) {
                scores.party += 2;
                scores.epic += 1;
            } else if (tempo < 90) {
                scores.chill += 2;
                scores.dark += 1;
            }

            if (acoustic > 0.7) {
                scores.organic += 3;
                scores.chill += 2;
            }

            if (instrumental > 0.5) {
                scores.mystic += 2;
                scores.epic += 1;
            }

            if (speech > 0.3) {
                scores.vibrant += 1;
            }

            if (liveness > 0.5) {
                scores.epic += 1;
                scores.vibrant += 1;
            }

            if (durationMin > 5) {
                scores.epic += 1;
                scores.chill += 1;
            }

            // Encontrar mood con mayor puntuación
            let maxScore = 0;
            let dominantMood = "balanced";

            for (const [mood, score] of Object.entries(scores)) {
                if (score > maxScore) {
                    maxScore = score;
                    dominantMood = mood;
                }
            }

            // Si no hay un mood claro, usar balanced
            if (maxScore < 3) {
                dominantMood = "balanced";
            }

            console.log(`🎭 Mood clasificado: ${dominantMood} (puntuación: ${maxScore})`);
            return dominantMood;
        }

        // ================== GENERACIÓN DE PALETAS ==================

        getPalette(features, durationMs, albumColors = null) {
            // Si tenemos colores de álbum, usarlos como base
            if (albumColors && albumColors.dominant_hex) {
                return this._createPaletteFromAlbumColors(albumColors, features);
            }

            // Si no, generar paleta basada en audio features
            const mood = this.classifyMood(features, durationMs);
            return this._createPaletteFromMood(mood, features);
        }

        _createPaletteFromAlbumColors(albumColors, features) {
            const energy = features.energy ?? 0.5;
            const valence = features.valence ?? 0.5;
            const tempo = features.tempo ?? 120;

            const dominant = albumColors.dominant_hex || "#22c55e";
            const palette = albumColors.palette_hex || [dominant];
            const mood = albumColors.color_mood || "balanced";

            // Generar colores complementarios y análogos
            const complementary = this._getComplementaryColor(dominant);
            const analogous = this._getAnalogousColors(dominant);

            // Ajustar intensidad basado en energía
            const intensity = 0.5 + energy * 0.5;
            const brightDominant = this._adjustColorBrightness(dominant, intensity * 20);
            const darkDominant = this._adjustColorBrightness(dominant, -intensity * 20);

            // Crear gradientes basados en tempo y valence
            const gradientStops = this._createGradientStops(palette, tempo, valence);

            return {
                mood: mood,
                dominant: dominant,
                bright_dominant: brightDominant,
                dark_dominant: darkDominant,
                complementary: complementary,
                analogous: analogous,
                palette: palette,
                background_gradient: gradientStops,
                connection_color: this._adjustColorSaturation(dominant, energy * 50),
                particle_glow: this._adjustColorBrightness(dominant, 40),
                energy_intensity: energy,
                color_vibrancy: energy > 0.7 ? "high" : energy > 0.4 ? "medium" : "low",
                visual_intensity: Math.min(1.0, energy * 0.8 + (tempo / 200))
            };
        }

        _createPaletteFromMood(mood, features) {
            const energy = features.energy ?? 0.5;
            const tempo = features.tempo ?? 120;

            let palette;

            switch (mood) {
                case 'party':
                    palette = {
                        mood: 'party',
                        dominant: '#22c55e',
                        bright_dominant: '#4ade80',
                        dark_dominant: '#16a34a',
                        complementary: '#f97316',
                        analogous: ['#3b82f6', '#a855f7'],
                        palette: ['#22c55e', '#3b82f6', '#a855f7', '#f97316'],
                        background_gradient: ['#020617', '#022c22', '#064e3b'],
                        connection_color: '#4ade80',
                        particle_glow: '#86efac'
                    };
                    break;

                case 'chill':
                    palette = {
                        mood: 'chill',
                        dominant: '#38bdf8',
                        bright_dominant: '#7dd3fc',
                        dark_dominant: '#0ea5e9',
                        complementary: '#f59e0b',
                        analogous: ['#a5b4fc', '#22c55e'],
                        palette: ['#38bdf8', '#a5b4fc', '#22c55e', '#f59e0b'],
                        background_gradient: ['#020617', '#0f172a', '#1d263b'],
                        connection_color: '#7dd3fc',
                        particle_glow: '#bae6fd'
                    };
                    break;

                case 'dark':
                    palette = {
                        mood: 'dark',
                        dominant: '#22c55e',
                        bright_dominant: '#4ade80',
                        dark_dominant: '#16a34a',
                        complementary: '#64748b',
                        analogous: ['#475569', '#94a3b8'],
                        palette: ['#22c55e', '#64748b', '#475569', '#94a3b8'],
                        background_gradient: ['#020617', '#020617', '#111827'],
                        connection_color: '#4ade80',
                        particle_glow: '#86efac'
                    };
                    break;

                case 'epic':
                    palette = {
                        mood: 'epic',
                        dominant: '#22c55e',
                        bright_dominant: '#4ade80',
                        dark_dominant: '#16a34a',
                        complementary: '#facc15',
                        analogous: ['#f97316', '#38bdf8'],
                        palette: ['#22c55e', '#facc15', '#f97316', '#38bdf8'],
                        background_gradient: ['#020617', '#052e16', '#0f172a'],
                        connection_color: '#facc15',
                        particle_glow: '#fde047'
                    };
                    break;

                case 'mystic':
                    palette = {
                        mood: 'mystic',
                        dominant: '#a855f7',
                        bright_dominant: '#c084fc',
                        dark_dominant: '#9333ea',
                        complementary: '#10b981',
                        analogous: ['#d946ef', '#8b5cf6'],
                        palette: ['#a855f7', '#d946ef', '#8b5cf6', '#10b981'],
                        background_gradient: ['#020617', '#1e1b4b', '#312e81'],
                        connection_color: '#c084fc',
                        particle_glow: '#e9d5ff'
                    };
                    break;

                default:
                    palette = {
                        mood: 'balanced',
                        dominant: '#22c55e',
                        bright_dominant: '#4ade80',
                        dark_dominant: '#16a34a',
                        complementary: '#3b82f6',
                        analogous: ['#38bdf8', '#a855f7'],
                        palette: ['#22c55e', '#3b82f6', '#a855f7'],
                        background_gradient: ['#020617', '#020617', '#022c22'],
                        connection_color: '#3b82f6',
                        particle_glow: '#86efac'
                    };
            }

            // Ajustar intensidad basada en energía
            palette.energy_intensity = energy;
            palette.color_vibrancy = energy > 0.7 ? "high" : energy > 0.4 ? "medium" : "low";
            palette.visual_intensity = Math.min(1.0, energy * 0.8 + (tempo / 200));

            return palette;
        }

        // ================== HELPERS DE COLOR ==================

        _getComplementaryColor(hex) {
            // Convertir hex a RGB
            let r = parseInt(hex.slice(1, 3), 16);
            let g = parseInt(hex.slice(3, 5), 16);
            let b = parseInt(hex.slice(5, 7), 16);

            // Calcular complementario
            r = 255 - r;
            g = 255 - g;
            b = 255 - b;

            // Convertir de nuevo a hex
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        }

        _getAnalogousColors(hex, count = 2) {
            // Convertir hex a HSL
            const hsl = this._hexToHSL(hex);
            const analogous = [];

            // Crear colores análogos (±30°)
            for (let i = 1; i <= count; i++) {
                const angle1 = (hsl[0] + (i * 30)) % 360;
                const angle2 = (hsl[0] - (i * 30) + 360) % 360;

                analogous.push(this._HSLToHex([angle1, hsl[1], hsl[2]]));
                analogous.push(this._HSLToHex([angle2, hsl[1], hsl[2]]));
            }

            return analogous.slice(0, count);
        }

        _adjustColorBrightness(hex, percent) {
            // Convertir hex a HSL
            const hsl = this._hexToHSL(hex);

            // Ajustar luminosidad
            hsl[2] = Math.max(0, Math.min(100, hsl[2] + percent));

            // Convertir de nuevo a hex
            return this._HSLToHex(hsl);
        }

        _adjustColorSaturation(hex, percent) {
            // Convertir hex a HSL
            const hsl = this._hexToHSL(hex);

            // Ajustar saturación
            hsl[1] = Math.max(0, Math.min(100, hsl[1] + percent));

            // Convertir de nuevo a hex
            return this._HSLToHex(hsl);
        }

        _createGradientStops(palette, tempo, valence) {
            const stops = [];
            const count = Math.min(4, palette.length);

            // Crear stops basados en tempo (más rápido = más stops)
            const stopCount = 3 + Math.floor(tempo / 60);

            for (let i = 0; i < Math.min(stopCount, palette.length); i++) {
                const color = palette[i];
                const position = i / Math.max(1, palette.length - 1);

                // Ajustar opacidad basado en valence
                const opacity = 0.1 + (valence * 0.2) + (i * 0.05);
                const colorWithAlpha = color + Math.floor(opacity * 255).toString(16).padStart(2, '0');

                stops.push({
                    color: colorWithAlpha,
                    position: position
                });
            }

            return stops;
        }

        _hexToHSL(hex) {
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

        _HSLToHex(hsl) {
            const h = hsl[0] / 360;
            const s = hsl[1] / 100;
            const l = hsl[2] / 100;

            let r, g, b;

            if (s === 0) {
                r = g = b = l;
            } else {
                const hue2rgb = (p, q, t) => {
                    if (t < 0) t += 1;
                    if (t > 1) t -= 1;
                    if (t < 1/6) return p + (q - p) * 6 * t;
                    if (t < 1/2) return q;
                    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                    return p;
                };

                const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                const p = 2 * l - q;

                r = hue2rgb(p, q, h + 1/3);
                g = hue2rgb(p, q, h);
                b = hue2rgb(p, q, h - 1/3);
            }

            const toHex = (x) => {
                const hex = Math.round(x * 255).toString(16);
                return hex.length === 1 ? '0' + hex : hex;
            };

            return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
        }

        // ================== MÉTODOS PÚBLICOS ==================

        getCurrentPalette() {
            return this.currentPalette;
        }

        getCurrentMood() {
            return this.currentMood;
        }

        applyPaletteToCanvas(containerEl, palette) {
            if (!containerEl || !palette) return;

            const [c1, c2, c3] = palette.background_gradient || ['#020617', '#020617', '#022c22'];
            const primary = palette.dominant || '#22c55e';
            const secondary = palette.complementary || '#3b82f6';

            containerEl.style.background = `
                radial-gradient(circle at top left, ${primary}30 0, transparent 55%),
                radial-gradient(circle at bottom right, ${secondary}30 0, transparent 60%),
                radial-gradient(circle at center, ${c1} 0, ${c2} 52%, ${c3} 100%)
            `;

            console.log("🎨 Palette aplicada al canvas");
        }

        generateColorForNode(index, totalNodes, palette) {
            if (!palette) {
                return this._generateRandomColor(index);
            }

            // Usar paleta para generar color consistente
            const colorArray = palette.palette || [palette.dominant];
            const colorIndex = index % colorArray.length;
            let baseColor = colorArray[colorIndex];

            // Variar ligeramente cada nodo
            const hsl = this._hexToHSL(baseColor);
            const hueVariation = (index * 137.5) % 360; // Ángulo dorado para distribución
            hsl[0] = (hsl[0] + hueVariation * 0.1) % 360;
            hsl[1] = Math.min(100, hsl[1] * (1.1 + (index % 3) * 0.1));
            hsl[2] = Math.min(100, hsl[2] * (0.9 + (index % 5) * 0.05));

            return this._HSLToHex(hsl);
        }

        _generateRandomColor(index) {
            // Generar color basado en índice (reproducible)
            const hue = (index * 137.5) % 360; // Ángulo dorado
            const saturation = 70 + (index % 30);
            const lightness = 50 + (index % 20);

            return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        }
    }

    // Exportar al ámbito global
    window.ColorSync = EnhancedColorSync;

    console.log("🎨 EnhancedColorSync cargado ✅");

})();
