#!/usr/bin/env python3
# ============================================================
# CRETE · WeRoad — bump_version.py
# Aggiorna la cache del sito in un colpo solo:
#   - incrementa ?v=N su tutti gli asset in index.html
#   - incrementa CACHE = "crete-weroad-vN" in sw.js
# Così, dopo ogni modifica, browser e PWA scaricano i file nuovi.
#
# Uso:
#   python python/bump_version.py            # auto-incrementa (es. 15 -> 16)
#   python python/bump_version.py --set 20   # forza una versione specifica
#   python python/bump_version.py --dry-run  # mostra cosa farebbe, senza scrivere
# ============================================================

import argparse
import re
import sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / "index.html"
SW = ROOT / "sw.js"

V_QUERY = re.compile(r"\?v=(\d+)")              # index.html  -> css/style.css?v=15
V_CACHE = re.compile(r'(crete-weroad-v)(\d+)')   # sw.js       -> "crete-weroad-v15"


def current_version() -> int:
    """Read the current version from index.html (?v=N)."""
    if not INDEX.exists():
        sys.exit(f"Non trovo {INDEX}")
    nums = [int(n) for n in V_QUERY.findall(INDEX.read_text(encoding="utf-8"))]
    return max(nums) if nums else 0


def main() -> None:
    ap = argparse.ArgumentParser(description="Bump della versione (cache-busting) del sito Crete WeRoad.")
    ap.add_argument("--set", type=int, default=None, help="Forza una versione specifica")
    ap.add_argument("--dry-run", action="store_true", help="Mostra le modifiche senza scrivere i file")
    args = ap.parse_args()

    cur = current_version()
    new = args.set if args.set is not None else cur + 1
    if new == cur:
        print(f"La versione è già {cur}, niente da fare.")
        return

    changes = []

    # index.html — tutti i ?v=
    if INDEX.exists():
        html = INDEX.read_text(encoding="utf-8")
        new_html, n = V_QUERY.subn(f"?v={new}", html)
        changes.append((INDEX, html, new_html, f"{n} riferimenti ?v="))
    # sw.js — nome della cache
    if SW.exists():
        sw = SW.read_text(encoding="utf-8")
        new_sw, n = V_CACHE.subn(lambda m: f"{m.group(1)}{new}", sw)
        changes.append((SW, sw, new_sw, f"{n} CACHE"))

    print(f"Versione: {cur} -> {new}")
    for path, old, new_text, info in changes:
        touched = old != new_text
        print(f"  {'[OK]' if touched else '[--]'} {path.name:<12} ({info})")
        if touched and not args.dry_run:
            path.write_text(new_text, encoding="utf-8")

    if args.dry_run:
        print("\n(dry-run: nessun file scritto)")
    else:
        print("\nFatto. Ricarica/ridistribuisci: browser e PWA prenderanno i file nuovi.")


if __name__ == "__main__":
    main()
