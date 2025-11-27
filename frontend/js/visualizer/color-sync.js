// frontend/js/visualizer/color-sync.js
// Calcula paletas de color a partir de la portada del álbum
// y las mezcla con las audio_features de Spotify.

(function () {
    // ========= Helpers numéricos / color =========

    function clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
    }

    function hexToRgb(hex) {
        if (!hex) return null;
        let h = hex.replace('#', '').trim();
        if (h.length === 3) {
            h = h.split('').map(c => c + c).join('');
        }
        if (h.length !== 6) return null;
        const num = parseInt(h, 16);
        return {
            r: (num >> 16) & 255,
            g: (num >> 8) & 255,
            b: num & 255
        };
    }

    function rgbToHex(r, g, b) {
        return (
            '#' +
            [r, g, b]
                .map(v => {
                    const n = clamp(v, 0, 255) | 0;
                    return n.toString(16).padStart(2, '0');
                })
                .join('')
        );
    }

    function mix(a, b, t) {
        return a + (b - a) * t;
    }

    function mixColor(c1, c2, t) {
        return {
            r: mix(c1.r, c2.r, t),
            g: mix(c1.g, c2.g, t),
            b: mix(c1.b, c2.b, t)
        };
    }

    function adjustLuminance(rgb, factor) {
        return {
            r: clamp(rgb.r * factor, 0, 255),
            g: clamp(rgb.g * factor, 0, 255),
            b: clamp(rgb.b * factor, 0, 255)
        };
    }

    function getContrastTextColor(rgb) {
        const { r, g, b } = rgb;
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }

    // ========= Canvas para samplear la portada =========

    let scratchCanvas = null;
    let scratchCtx = null;

    function ensureCanvas() {
        if (!scratchCanvas) {
            scratchCanvas = document.createElement('canvas');
            scratchCanvas.width = 64;
            scratchCanvas.height = 64;
            scratchCtx = scratchCanvas.getContext('2d');
        }
    }

    function parseRgbKey(key) {
        const parts = key.split(',').map(n => parseInt(n, 10) || 0);
        return { r: parts[0], g: parts[1], b: parts[2] };
    }

    function defaultColorInfo() {
        const dominantRgb = { r: 15, g: 23, b: 42 }; // #0f172a
        const secondaryRgb = { r: 34, g: 197, b: 94 }; // #22c55e
        const accentRgb = { r: 56, g: 189, b: 248 }; // #38bdf8

        return {
            primaryRgb: dominantRgb,
            primaryHex: rgbToHex(dominantRgb.r, dominantRgb.g, dominantRgb.b),
            secondaryRgb,
            secondaryHex: rgbToHex(secondaryRgb.r, secondaryRgb.g, secondaryRgb.b),
            accentRgb,
            accentHex: rgbToHex(accentRgb.r, accentRgb.g, accentRgb.b),
            paletteRgb: [dominantRgb, secondaryRgb, accentRgb],
            paletteHex: [
                rgbToHex(dominantRgb.r, dominantRgb.g, dominantRgb.b),
                rgbToHex(secondaryRgb.r, secondaryRgb.g, secondaryRgb.b),
                rgbToHex(accentRgb.r, accentRgb.g, accentRgb.b)
            ],
            textColor: '#ffffff'
        };
    }

    async function extractColorsFromImage(imageUrl) {
        if (!imageUrl) {
            return defaultColorInfo();
        }

        return new Promise((resolve) => {
            try {
                ensureCanvas();
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    try {
                        const canvas = scratchCanvas;
                        const ctx = scratchCtx;

                        const size = 64;
                        canvas.width = size;
                        canvas.height = size;
                        ctx.clearRect(0, 0, size, size);

                        const { width, height } = img;
                        const scale = Math.min(size / width, size / height);
                        const drawWidth = width * scale;
                        const drawHeight = height * scale;
                        const dx = (size - drawWidth) / 2;
                        const dy = (size - drawHeight) / 2;

                        ctx.drawImage(img, dx, dy, drawWidth, drawHeight);

                        const imageData = ctx.getImageData(0, 0, size, size);
                        const data = imageData.data;

                        const freq = {};
                        const step = 4 * 4; // saltar algunos píxeles para rendimiento

                        for (let i = 0; i < data.length; i += step) {
                            const r = data[i];
                            const g = data[i + 1];
                            const b = data[i + 2];
                            const a = data[i + 3];
                            if (a < 128) continue; // ignorar píxeles muy transparentes

                            const key = `${r},${g},${b}`;
                            freq[key] = (freq[key] || 0) + 1;
                        }

                        const keys = Object.keys(freq);
                        if (!keys.length) {
                            resolve(defaultColorInfo());
                            return;
                        }

                        keys.sort((a, b) => freq[b] - freq[a]);
                        const top = keys.slice(0, 6);

                        const paletteRgb = top.map(parseRgbKey);
                        const primaryRgb = paletteRgb[0];
                        const secondaryRgb = paletteRgb[1] || adjustLuminance(primaryRgb, 1.2);
                        const accentRgb = paletteRgb[2] || adjustLuminance(primaryRgb, 0.7);

                        const primaryHex = rgbToHex(primaryRgb.r, primaryRgb.g, primaryRgb.b);
                        const secondaryHex = rgbToHex(secondaryRgb.r, secondaryRgb.g, secondaryRgb.b);
                        const accentHex = rgbToHex(accentRgb.r, accentRgb.g, accentRgb.b);

                        const textColor = getContrastTextColor(primaryRgb);

                        resolve({
                            primaryRgb,
                            primaryHex,
                            secondaryRgb,
                            secondaryHex,
                            accentRgb,
                            accentHex,
                            paletteRgb,
                            paletteHex: paletteRgb.map(c => rgbToHex(c.r, c.g, c.b)),
                            textColor
                        });
                    } catch (err) {
                        console.warn('[ColorSync] Error leyendo píxeles de portada:', err);
                        resolve(defaultColorInfo());
                    }
                };
                img.onerror = () => {
                    console.warn('[ColorSync] Error cargando portada, usando colores por defecto');
                    resolve(defaultColorInfo());
                };
                img.src = imageUrl;
            } catch (e) {
                console.warn('[ColorSync] Excepción en extractColorsFromImage:', e);
                resolve(defaultColorInfo());
            }
        });
    }

    function mapFeaturesToTheme(features = {}, colorInfo) {
        const energy = typeof features.energy === 'number' ? features.energy : 0.6;
        const danceability = typeof features.danceability === 'number' ? features.danceability : 0.5;
        const valence = typeof features.valence === 'number' ? features.valence : 0.5;
        const tempo = typeof features.tempo === 'number' ? features.tempo : 120;

        // Intensidad / velocidad globales del tema
        const intensity = clamp(0.4 + energy * 0.6, 0.4, 1.0);
        const speedFactor = clamp(0.5 + energy * 1.0, 0.5, 1.8);
        const pulseFactor = clamp(0.6 + danceability * 0.8, 0.6, 1.6);

        // 0 = súper frío, 1 = súper cálido
        const moodWarm = clamp(valence, 0, 1);
        const warmColor = { r: 244, g: 114, b: 182 }; // rosa
        const coldColor = { r: 56, g: 189, b: 248 };  // azul

        // Color "mood" según valence
        const moodColor = mixColor(coldColor, warmColor, moodWarm);

        // Teñimos los colores de la portada con el mood
        const primaryRgb = mixColor(colorInfo.primaryRgb, moodColor, 0.35);
        const secondaryRgb = mixColor(colorInfo.secondaryRgb, moodColor, 0.25);

        // Accent mezclado entre mood y accent real de la portada
        const baseAccent = mixColor(moodColor, colorInfo.accentRgb, 0.6);
        const accent = baseAccent;

        // Fondo: más oscuro en temas low-energy + pequeño toque de mood
        const bgModifier = 0.3 + (1 - energy) * 0.4;
        const bgBase = adjustLuminance(primaryRgb, bgModifier);
        const backgroundRgb = mixColor(bgBase, moodColor, 0.25);

        return {
            primary: rgbToHex(primaryRgb.r, primaryRgb.g, primaryRgb.b),
            secondary: rgbToHex(secondaryRgb.r, secondaryRgb.g, secondaryRgb.b),
            accent: rgbToHex(accent.r, accent.g, accent.b),
            background: rgbToHex(backgroundRgb.r, backgroundRgb.g, backgroundRgb.b),
            text: colorInfo.textColor,
            intensity,
            speedFactor,
            pulseFactor,
            tempo
        };
    }


    async function buildThemeFromTrack(trackData) {
        if (!trackData) {
            return mapFeaturesToTheme({}, defaultColorInfo());
        }

        const item = trackData.item || trackData.track || null;
        const coverUrl =
            item?.album?.images?.[0]?.url ||
            item?.album?.images?.[1]?.url ||
            null;

        const features = trackData.audio_features || {};

        const colorInfo = await extractColorsFromImage(coverUrl);
        const theme = mapFeaturesToTheme(features, colorInfo);

        return theme;
    }

    window.ColorSync = {
        buildThemeFromTrack,
        mapFeaturesToTheme,
        extractColorsFromImage,
        hexToRgb,
        rgbToHex
    };
})();
