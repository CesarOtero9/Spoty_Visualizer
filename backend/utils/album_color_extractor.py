# backend/utils/album_color_extractor.py

"""
Utilidad para extraer colores dominantes de una portada de álbum.

Usa Pillow (PIL) para:
- Descargar la imagen desde una URL.
- Reducir tamaño.
- Contar colores más frecuentes.
- Devolver una paleta y colores en RGB/HEX.
"""

from __future__ import annotations

import io
from collections import Counter
from typing import Tuple, List

import requests
from PIL import Image


def _download_image(url: str) -> Image.Image | None:
    """
    Descarga la imagen desde la URL y la abre con Pillow.
    """
    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        img = Image.open(io.BytesIO(resp.content)).convert("RGB")
        return img
    except Exception as e:
        print(f"[album_color_extractor] Error al descargar imagen: {e}")
        return None


def _rgb_to_hex(rgb: Tuple[int, int, int]) -> str:
    return "#{:02x}{:02x}{:02x}".format(*rgb)


def _get_palette_from_image(
    img: Image.Image,
    num_colors: int = 5,
    sample_size: int = 64
) -> List[Tuple[int, int, int]]:
    """
    Reduce la imagen y obtiene los colores más frecuentes.
    """
    # Reducir tamaño para simplificar
    img_small = img.resize((sample_size, sample_size))
    pixels = list(img_small.getdata())

    counter = Counter(pixels)
    most_common = [color for color, _ in counter.most_common(num_colors)]
    return most_common


def _get_contrast_text_color(rgb: Tuple[int, int, int]) -> str:
    """
    Calcula si conviene texto negro o blanco encima del color dado.
    Fórmula estándar de luminancia.
    """
    r, g, b = rgb
    luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    # Si es muy claro, texto negro; si es oscuro, texto blanco.
    return "#000000" if luminance > 0.5 else "#ffffff"


def get_album_colors_from_url(
    image_url: str,
    num_colors: int = 5
) -> dict:
    """
    Función principal: dado el URL de la portada, regresa:
    - dominant_rgb / dominant_hex
    - palette_rgb / palette_hex
    - suggested_text_color (para títulos/botones)
    """
    img = _download_image(image_url)
    if img is None:
        # Fallback: tema oscuro genérico
        return {
            "dominant_rgb": (15, 15, 25),
            "dominant_hex": "#0f0f19",
            "palette_rgb": [(15, 15, 25), (60, 60, 80), (120, 200, 160)],
            "palette_hex": ["#0f0f19", "#3c3c50", "#78c8a0"],
            "suggested_text_color": "#ffffff"
        }

    palette = _get_palette_from_image(img, num_colors=num_colors)
    if not palette:
        # Si por alguna razón la paleta sale vacía
        palette = [(15, 15, 25)]

    dominant = palette[0]
    dominant_hex = _rgb_to_hex(dominant)

    return {
        "dominant_rgb": dominant,
        "dominant_hex": dominant_hex,
        "palette_rgb": palette,
        "palette_hex": [_rgb_to_hex(c) for c in palette],
        "suggested_text_color": _get_contrast_text_color(dominant)
    }
