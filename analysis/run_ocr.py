#!/usr/bin/env python3
"""
Run multiple OCR engines on the puzzle images and collect raw output.

Engines used:
  - EasyOCR (English + Russian) - handles handwritten/stylised text reasonably.
  - RapidOCR (ONNX port of PaddleOCR) - second opinion, no torch needed.

Tesseract and docTR were requested in the task description but:
  - Tesseract: no system package available in Amazon Linux 2023 base repos.
  - docTR: pulls in tensorflow/torch and is duplicative of EasyOCR for this use.

We save every detected text line with confidence to JSON and to a flat .txt
file per image so the results can be diffed/grepped.
"""

from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT  = Path(__file__).resolve().parent / "ocr_results"
OUT.mkdir(parents=True, exist_ok=True)

IMAGES = [
    "orginal resolutions image.png",
    "0.2-btc-puzzle orginal.png",
    "puzzle with red text.png",
    "puzzle red text 2.jpg",
    "puzzle red colour text 3.jpg",
    "puzzle with enhanced saturation.png",
    "green stains isolation.jpg",
    "statue book hidden msg.png",
    "Screenshot_20260506_084931.jpg",
    "Screenshot_20260506_084937.jpg",
    "Screenshot_20260506_085946.jpg",
    "Screenshot_20260506_090014.jpg",
    "Screenshot_20260506_090300.jpg",
    "Screenshot_20260506_090911.jpg",
    "Screenshot_20260506_090917.jpg",
]


def run_easyocr():
    import easyocr  # type: ignore
    # English + Russian (puzzle contains Cyrillic runes)
    reader = easyocr.Reader(["en", "ru"], gpu=False, verbose=False)
    results: dict[str, list] = {}
    for name in IMAGES:
        path = ROOT / name
        if not path.exists():
            print(f"  [skip] {name} (missing)")
            continue
        t0 = time.time()
        try:
            raw = reader.readtext(str(path), detail=1, paragraph=False)
        except Exception as e:  # pragma: no cover
            print(f"  [err ] {name}: {e}")
            continue
        # Normalise to JSON friendly form
        items = [
            {
                "bbox": [[float(x), float(y)] for x, y in box],
                "text": text,
                "conf": float(conf),
            }
            for box, text, conf in raw
        ]
        results[name] = items
        dt = time.time() - t0
        print(f"  [easy] {name:55s}  {len(items):4d} boxes  {dt:5.1f}s")
        # per image flat dump
        with open(OUT / f"{Path(name).stem}.easyocr.txt", "w") as f:
            for it in items:
                f.write(f"{it['conf']:.2f}\t{it['text']}\n")
    with open(OUT / "easyocr.json", "w") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)


def run_rapidocr():
    from rapidocr_onnxruntime import RapidOCR  # type: ignore
    engine = RapidOCR()
    results: dict[str, list] = {}
    for name in IMAGES:
        path = ROOT / name
        if not path.exists():
            continue
        t0 = time.time()
        try:
            out, _ = engine(str(path))
        except Exception as e:  # pragma: no cover
            print(f"  [err ] {name}: {e}")
            continue
        items = []
        if out:
            for row in out:
                # row: [bbox(4 points), text, score]
                box, text, score = row
                items.append(
                    {
                        "bbox": [[float(x), float(y)] for x, y in box],
                        "text": text,
                        "conf": float(score),
                    }
                )
        results[name] = items
        dt = time.time() - t0
        print(f"  [rapi] {name:55s}  {len(items):4d} boxes  {dt:5.1f}s")
        with open(OUT / f"{Path(name).stem}.rapidocr.txt", "w") as f:
            for it in items:
                f.write(f"{it['conf']:.2f}\t{it['text']}\n")
    with open(OUT / "rapidocr.json", "w") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)


def main(argv: list[str]) -> int:
    engines = set(argv[1:]) or {"easyocr", "rapidocr"}
    print(f"Engines: {sorted(engines)}")
    if "easyocr" in engines:
        print("\n--- EasyOCR ---")
        run_easyocr()
    if "rapidocr" in engines:
        print("\n--- RapidOCR ---")
        run_rapidocr()
    print(f"\nResults written to {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
