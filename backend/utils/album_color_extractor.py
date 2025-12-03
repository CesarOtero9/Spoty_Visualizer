# backend/utils/album_color_extractor.py

"""
EXTRACCIÓN AVANZADA DE COLORES DE PORTADAS DE ÁLBUM
Usa K-Means clustering para obtener colores dominantes
y genera paletas armónicas basadas en teoría del color.
"""

from __future__ import annotations

import io
import colorsys
from typing import Tuple, List, Dict
from collections import Counter
import numpy as np

import requests
from PIL import Image
from sklearn.cluster import KMeans


class AdvancedColorExtractor:
    def __init__(self):
        self.cache = {}  # Cache simple para no repetir extracciones

    def download_image(self, url: str) -> Image.Image | None:
        """Descarga imagen con manejo robusto de errores"""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            response = requests.get(url, headers=headers, timeout=15)
            response.raise_for_status()

            # Verificar que sea una imagen
            if 'image' not in response.headers.get('Content-Type', ''):
                print(f"[ColorExtractor] ❌ URL no es imagen: {url}")
                return None

            img = Image.open(io.BytesIO(response.content)).convert("RGB")
            return img

        except Exception as e:
            print(f"[ColorExtractor] Error descargando {url}: {e}")
            return None

    def extract_dominant_colors_kmeans(self, img: Image.Image, n_colors: int = 8) -> List[Tuple[int, int, int]]:
        """
        Extrae colores dominantes usando K-Means clustering.
        Más preciso que contar píxeles simples.
        """
        # Reducir tamaño para procesamiento más rápido
        img_small = img.resize((150, 150))

        # Convertir a array numpy
        img_array = np.array(img_small)
        pixels = img_array.reshape(-1, 3)

        # Aplicar K-Means
        kmeans = KMeans(n_clusters=n_colors, n_init=10, random_state=42)
        kmeans.fit(pixels)

        # Obtener centros de clusters (colores dominantes)
        colors = kmeans.cluster_centers_

        # Ordenar por frecuencia
        labels = kmeans.labels_
        label_counts = Counter(labels)
        sorted_indices = sorted(range(n_colors), key=lambda i: -label_counts[i])

        # Convertir a enteros nativos de Python
        result = []
        for i in sorted_indices:
            color_tuple = tuple(int(c) for c in colors[i])
            result.append(color_tuple)

        return result

    def rgb_to_hsl(self, rgb: Tuple[int, int, int]) -> Tuple[float, float, float]:
        """Convierte RGB a HSL (Hue, Saturation, Lightness)"""
        r, g, b = [x / 255.0 for x in rgb]
        h, l, s = colorsys.rgb_to_hls(r, g, b)
        return (float(h * 360), float(s * 100), float(l * 100))

    def hsl_to_rgb(self, hsl: Tuple[float, float, float]) -> Tuple[int, int, int]:
        """Convierte HSL a RGB"""
        h, s, l = hsl
        r, g, b = colorsys.hls_to_rgb(h / 360, l / 100, s / 100)
        return (int(r * 255), int(g * 255), int(b * 255))

    def generate_color_palette(self, dominant_colors: List[Tuple[int, int, int]]) -> Dict:
        """
        Genera una paleta completa basada en colores dominantes:
        - Dominante principal
        - Complementarios
        - Análogos
        - Triádicos
        - Monocromáticos
        """
        if not dominant_colors:
            return self.get_default_palette()

        # Convertir a HSL para trabajar con teoría del color
        hsl_colors = [self.rgb_to_hsl(rgb) for rgb in dominant_colors[:5]]

        # 1. Color dominante (el más saturado/vibrante)
        dominant_hsl = max(hsl_colors, key=lambda x: x[1])  # Mayor saturación
        dominant_rgb = self.hsl_to_rgb(dominant_hsl)

        # 2. Color complementario (180° en la rueda de color)
        comp_h = (dominant_hsl[0] + 180) % 360
        complementary_rgb = self.hsl_to_rgb((comp_h, dominant_hsl[1], dominant_hsl[2]))

        # 3. Colores análogos (±30°)
        analogous1_h = (dominant_hsl[0] + 30) % 360
        analogous2_h = (dominant_hsl[0] - 30) % 360
        analogous1_rgb = self.hsl_to_rgb((analogous1_h, dominant_hsl[1], dominant_hsl[2]))
        analogous2_rgb = self.hsl_to_rgb((analogous2_h, dominant_hsl[1], dominant_hsl[2]))

        # 4. Colores triádicos (±120°)
        triadic1_h = (dominant_hsl[0] + 120) % 360
        triadic2_h = (dominant_hsl[0] - 120) % 360
        triadic1_rgb = self.hsl_to_rgb((triadic1_h, dominant_hsl[1], dominant_hsl[2]))
        triadic2_rgb = self.hsl_to_rgb((triadic2_h, dominant_hsl[1], dominant_hsl[2]))

        # 5. Escala monocromática (variando luminosidad)
        mono_colors = []
        for lightness in [20, 40, 60, 80]:
            mono_rgb = self.hsl_to_rgb((dominant_hsl[0], dominant_hsl[1], lightness))
            mono_colors.append(mono_rgb)

        # 6. Color de acento (contraste vibrante)
        accent_h = (dominant_hsl[0] + 150) % 360
        accent_rgb = self.hsl_to_rgb((accent_h, min(dominant_hsl[1] * 1.3, 100),
                                      min(dominant_hsl[2] * 1.2, 100)))

        # 7. Colores de fondo (más oscuros/transparentes)
        bg_dark = self.hsl_to_rgb((dominant_hsl[0], dominant_hsl[1] * 0.3, dominant_hsl[2] * 0.2))
        bg_medium = self.hsl_to_rgb((dominant_hsl[0], dominant_hsl[1] * 0.5, dominant_hsl[2] * 0.3))

        # Calcular mood basado en colores dominantes
        mood = self._calculate_color_mood(hsl_colors)

        return {
            "dominant": dominant_rgb,
            "complementary": complementary_rgb,
            "analogous": [analogous1_rgb, analogous2_rgb],
            "triadic": [triadic1_rgb, triadic2_rgb],
            "monochromatic": mono_colors,
            "accent": accent_rgb,
            "backgrounds": [bg_dark, bg_medium],
            "mood": mood,
            "all_colors_rgb": dominant_colors,
            "all_colors_hsl": hsl_colors
        }

    def _calculate_color_mood(self, hsl_colors: List[Tuple[float, float, float]]) -> str:
        """Determina el mood/atmósfera basado en los colores"""
        # Convertir a valores float nativos
        avg_saturation = float(np.mean([hsl[1] for hsl in hsl_colors]))
        avg_lightness = float(np.mean([hsl[2] for hsl in hsl_colors]))
        avg_hue = float(np.mean([hsl[0] for hsl in hsl_colors]))

        # Clasificación por HSL
        if avg_saturation < 30:
            if avg_lightness > 70:
                return "ethereal"  # Etéreo/blanquecino
            elif avg_lightness < 30:
                return "noir"  # Oscuro/negro
            else:
                return "monochrome"  # Monocromático

        # Clasificación por tono (rueda de color)
        if 0 <= avg_hue < 30 or 330 <= avg_hue <= 360:
            return "fiery"  # Rojo/naranja - apasionado
        elif 30 <= avg_hue < 90:
            return "sunny"  # Amarillo - alegre
        elif 90 <= avg_hue < 150:
            return "verdant"  # Verde - natural
        elif 150 <= avg_hue < 210:
            return "oceanic"  # Azul-verde - calmado
        elif 210 <= avg_hue < 270:
            return "deep_blue"  # Azul - profundo
        elif 270 <= avg_hue < 330:
            return "mystic"  # Púrpura - místico

        return "vibrant"

    def get_text_color_for_background(self, rgb: Tuple[int, int, int]) -> str:
        """Determina si usar texto blanco o negro según luminosidad"""
        # Fórmula de luminosidad relativa (WCAG)
        r, g, b = rgb
        luminance = (0.2126 * r / 255 + 0.7152 * g / 255 + 0.0722 * b / 255)
        return "#000000" if luminance > 0.179 else "#ffffff"

    def get_default_palette(self) -> Dict:
        """Paleta por defecto para casos de error"""
        return {
            "dominant": (34, 197, 94),  # Verde Spotify
            "complementary": (244, 63, 94),  # Rosado
            "analogous": [(59, 130, 246), (139, 92, 246)],  # Azul, púrpura
            "triadic": [(245, 158, 11), (168, 85, 247)],  # Naranja, violeta
            "monochromatic": [(20, 83, 45), (34, 197, 94), (134, 239, 172)],
            "accent": (249, 115, 22),  # Naranja brillante
            "backgrounds": [(15, 23, 42), (30, 41, 59)],
            "mood": "balanced",
            "all_colors_rgb": [(34, 197, 94), (59, 130, 246), (168, 85, 247)],
            "all_colors_hsl": [(145, 86, 45), (217, 91, 60), (267, 91, 66)]
        }

    def rgb_to_hex(self, rgb: Tuple[int, int, int]) -> str:
        """Convierte RGB a hexadecimal"""
        return f"#{rgb[0]:02x}{rgb[1]:02x}{rgb[2]:02x}"

    def extract_album_colors(self, image_url: str, use_cache: bool = True) -> Dict:
        """
        Función principal: extrae colores avanzados de una portada
        """
        # Verificar cache
        cache_key = hash(image_url)
        if use_cache and cache_key in self.cache:
            print(f"[ColorExtractor] ♻️ Usando colores en cache para: {image_url[:50]}...")
            return self.cache[cache_key]

        print(f"[ColorExtractor] 🎨 Procesando imagen: {image_url[:50]}...")

        # 1. Descargar imagen
        img = self.download_image(image_url)
        if img is None:
            print(f"[ColorExtractor] ❌ No se pudo descargar imagen")
            default = self.get_default_palette()
            self.cache[cache_key] = default
            return default

        # 2. Extraer colores dominantes con K-Means
        try:
            dominant_colors = self.extract_dominant_colors_kmeans(img, n_colors=8)
            print(f"[ColorExtractor] ✅ {len(dominant_colors)} colores extraídos")
        except Exception as e:
            print(f"[ColorExtractor] ❌ Error en K-Means: {e}")
            dominant_colors = []

        # 3. Generar paleta completa
        palette = self.generate_color_palette(dominant_colors)

        # 4. Convertir a formatos útiles
        final_result = {
            "dominant_rgb": palette["dominant"],
            "dominant_hex": self.rgb_to_hex(palette["dominant"]),
            "accent_rgb": palette["accent"],
            "accent_hex": self.rgb_to_hex(palette["accent"]),
            "palette_rgb": palette["all_colors_rgb"][:5],
            "palette_hex": [self.rgb_to_hex(c) for c in palette["all_colors_rgb"][:5]],
            "analogous_colors": palette["analogous"],
            "triadic_colors": palette["triadic"],
            "monochromatic_colors": palette["monochromatic"],
            "background_gradient": [
                self.rgb_to_hex(palette["backgrounds"][0]),
                self.rgb_to_hex(palette["backgrounds"][1]),
                self.rgb_to_hex(palette["dominant"])
            ],
            "text_color": self.get_text_color_for_background(palette["dominant"]),
            "color_mood": palette["mood"],
            "color_vibrancy": "high" if palette["mood"] in ["fiery", "sunny", "vibrant"] else "medium",
            "contrast_ratio": self._calculate_contrast(palette["dominant"], palette["accent"])
        }

        # Guardar en cache
        self.cache[cache_key] = final_result

        print(f"[ColorExtractor] 🎨 Paleta generada - Mood: {palette['mood']}")
        return final_result

    def _calculate_contrast(self, color1: Tuple[int, int, int], color2: Tuple[int, int, int]) -> float:
        """Calcula ratio de contraste entre dos colores"""

        def relative_luminance(rgb):
            r, g, b = [x / 255.0 for x in rgb]
            r = r / 12.92 if r <= 0.03928 else ((r + 0.055) / 1.055) ** 2.4
            g = g / 12.92 if g <= 0.03928 else ((g + 0.055) / 1.055) ** 2.4
            b = b / 12.92 if b <= 0.03928 else ((b + 0.055) / 1.055) ** 2.4
            return 0.2126 * r + 0.7152 * g + 0.0722 * b

        l1 = float(relative_luminance(color1))
        l2 = float(relative_luminance(color2))

        lighter = max(l1, l2)
        darker = min(l1, l2)

        return float((lighter + 0.05) / (darker + 0.05))


# Función conveniente para compatibilidad
def get_album_colors_from_url(image_url: str, num_colors: int = 5) -> dict:
    """
    Función wrapper para compatibilidad con código existente
    """
    extractor = AdvancedColorExtractor()
    result = extractor.extract_album_colors(image_url)

    # Asegurar que todos los valores sean serializables
    def make_serializable(obj):
        if isinstance(obj, tuple):
            return list(obj)
        elif isinstance(obj, list):
            return [make_serializable(item) for item in obj]
        elif isinstance(obj, dict):
            return {k: make_serializable(v) for k, v in obj.items()}
        elif isinstance(obj, (np.integer, np.int64)):
            return int(obj)
        elif isinstance(obj, (np.floating, np.float64)):
            return float(obj)
        else:
            return obj

    result = make_serializable(result)

    return {
        "dominant_rgb": result["dominant_rgb"],
        "dominant_hex": result["dominant_hex"],
        "palette_rgb": result["palette_rgb"],
        "palette_hex": result["palette_hex"],
        "suggested_text_color": result["text_color"],
        "color_mood": result["color_mood"],
        "contrast_ratio": float(result["contrast_ratio"]),
        "advanced": result
    }