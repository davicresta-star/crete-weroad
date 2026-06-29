#!/usr/bin/env python3
# ============================================================
# CRETE · WeRoad — optimize_images.py
# Converts JPG/PNG in /images to WebP, resizes, compresses,
# and generates thumbnails — keeping high visual quality.
#
# Usage:
#   pip install pillow
#   python python/optimize_images.py                 # process all /images
#   python python/optimize_images.py images/hero     # one folder
#   python python/optimize_images.py --max 2400 --quality 82 --thumb 600
#
# Output (next to each source file):
#   photo.jpg  ->  photo.webp        (full, resized to --max)
#                  photo-thumb.webp  (thumbnail, --thumb wide)
# Originals are left untouched.
# ============================================================

import argparse
import sys
from pathlib import Path

# Make stdout UTF-8 safe on Windows consoles (cp1252) so it never crashes on prints.
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit("Pillow non installato.  Esegui:  pip install pillow")

SRC_EXT = {".jpg", ".jpeg", ".png"}


def optimize(path: Path, max_w: int, quality: int, thumb_w: int) -> None:
    """Create an optimized .webp and a .webp thumbnail for one image."""
    if path.suffix.lower() == ".webp" or path.stem.endswith("-thumb"):
        return  # skip already-optimized / thumbnails

    with Image.open(path) as im:
        im = ImageOps.exif_transpose(im)            # respect camera rotation
        if im.mode in ("P", "RGBA"):
            im = im.convert("RGB")

        # --- full-size webp ---
        full = im.copy()
        if full.width > max_w:
            ratio = max_w / full.width
            full = full.resize((max_w, round(full.height * ratio)), Image.LANCZOS)
        out_full = path.with_suffix(".webp")
        full.save(out_full, "WEBP", quality=quality, method=6)

        # --- thumbnail webp ---
        thumb = im.copy()
        if thumb.width > thumb_w:
            ratio = thumb_w / thumb.width
            thumb = thumb.resize((thumb_w, round(thumb.height * ratio)), Image.LANCZOS)
        out_thumb = path.with_name(f"{path.stem}-thumb.webp")
        thumb.save(out_thumb, "WEBP", quality=max(quality - 5, 60), method=6)

    saved = path.stat().st_size - out_full.stat().st_size
    print(f"  [OK] {path.name:<32} -> {out_full.name}  (-{saved // 1024} KB)  + thumb")


def main() -> None:
    ap = argparse.ArgumentParser(description="Optimize images to WebP for the Crete WeRoad site.")
    ap.add_argument("root", nargs="?", default="images", help="Folder to process (default: images)")
    ap.add_argument("--max", type=int, default=2400, help="Max width for full images (px)")
    ap.add_argument("--quality", type=int, default=82, help="WebP quality 0-100")
    ap.add_argument("--thumb", type=int, default=600, help="Thumbnail width (px)")
    args = ap.parse_args()

    root = Path(args.root)
    if not root.exists():
        sys.exit(f"Cartella non trovata: {root}")

    images = [p for p in root.rglob("*") if p.suffix.lower() in SRC_EXT]
    if not images:
        print(f"Nessuna immagine JPG/PNG trovata in {root}.")
        return

    print(f"Ottimizzazione di {len(images)} immagini in '{root}'  "
          f"(max {args.max}px · q{args.quality} · thumb {args.thumb}px)\n")
    for p in sorted(images):
        try:
            optimize(p, args.max, args.quality, args.thumb)
        except Exception as e:  # keep going on a bad file
            print(f"  [SKIP] {p.name}: {e}")

    print("\nFatto. Ricorda di aggiornare i percorsi nell'HTML/JS in .webp se necessario.")


if __name__ == "__main__":
    main()
