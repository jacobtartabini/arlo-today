#!/usr/bin/env python3
"""Build macOS menu-bar tray icons from src-tauri/icons/icon.png."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src-tauri" / "icons" / "icon.png"
OUT = ROOT / "src-tauri" / "icons"


def build_tray_mask(source: Image.Image) -> Image.Image:
    """Extract a bold black silhouette on transparent background for macOS templates."""
    rgba = source.convert("RGBA").resize((256, 256), Image.Resampling.LANCZOS)
    gray = ImageOps.grayscale(rgba)
    gray_px = gray.load()

    # Sample corners to estimate the background level.
    corners = [
        gray_px[0, 0],
        gray_px[gray.width - 1, 0],
        gray_px[0, gray.height - 1],
        gray_px[gray.width - 1, gray.height - 1],
    ]
    background = sum(corners) / len(corners)

    mask = Image.new("L", gray.size, 0)
    mask_px = mask.load()

    # Keep anything noticeably brighter than the background; use full opacity for template mode.
    threshold = max(6, int(background + 8))
    for y in range(gray.height):
        for x in range(gray.width):
            if gray_px[x, y] > threshold:
                mask_px[x, y] = 255

    # Thicken strokes so the 22pt menu-bar icon stays legible.
    mask = mask.filter(ImageFilter.MaxFilter(5))
    mask = mask.filter(ImageFilter.MinFilter(3))

    tray = Image.new("RGBA", mask.size, (0, 0, 0, 0))
    tray_px = tray.load()
    for y in range(mask.height):
        for x in range(mask.width):
            if mask_px[x, y] > 0:
                tray_px[x, y] = (0, 0, 0, 255)

    return tray


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"Missing source icon: {SRC}")

    tray = build_tray_mask(Image.open(SRC))

    tray.resize((44, 44), Image.Resampling.LANCZOS).save(OUT / "tray-icon.png")
    tray.resize((22, 22), Image.Resampling.LANCZOS).save(OUT / "tray-icon@2x.png")
    tray.resize((30, 30), Image.Resampling.LANCZOS).save(OUT / "Square30x30Logo.png")
    print("Generated tray icons in", OUT)


if __name__ == "__main__":
    main()
