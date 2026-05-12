#!/usr/bin/env python3
"""
Scan every OCR result and every hint phrase from the task description against
the BIP-39 English wordlist. Surface candidate seed words.

The wordlist is fetched from the canonical bitcoin/bips repository on first
run and cached locally.
"""

from __future__ import annotations

import json
import re
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
WL = HERE / "english.txt"
URL = "https://raw.githubusercontent.com/bitcoin/bips/master/bip-0039/english.txt"


def get_wordlist() -> set[str]:
    if not WL.exists():
        urllib.request.urlretrieve(URL, WL)
    return {w.strip() for w in WL.read_text().splitlines() if w.strip()}


# Visible / clue text we have gathered from OCR + the user's hints.
CORPUS = """
Order and stability
Find the seed phrase in this picture
Welcome to the brave new world
Black lives matter
No justice no peace
End police brutality
Stop killing us not one more
I can't breathe
05.25.20
11.03.20
1865-202
Fuck this shit
Only real bitcoin
Only bitcoin
SHT
BLM
COVID 19 is a hoax 5G is the killer
Charly
Food
Moon
Tower
Tuesday
This is the first prediction
Pay for the future
Esse quam niger es sic dixit caccabus ollae
Rerum cognoscere causas
Fiat iustitia et pereat mundus
Ubi bene ibi patria
Neither slavery nor involuntary servitude except as a punishment for crime
whereof the party shall have been duly convicted shall exist within the
United States or any place subject to their jurisdiction
We define an electronic coin as a chain of digital signatures
Each owner transfers the coin to the next by digitally signing a hash
of the previous transaction and the public key of the next owner
A payee can verify the signatures to verify the chain of ownership
The common solution is to introduce a central authority or mint
that checks every transaction for double spending
Coins issued directly from the mint are trusted not to be double spent
The problem is that the entire money system depends on the company
running the mint with every transaction having to go through them
just like a bank
For our purposes the earliest transaction is the one that counts
so we don't care about later attempts to double spend
The only way to confirm the absence of a transaction is to be aware
of all transactions
In which they were received the payee needs proof that at the time
of each transaction the majority of nodes agreed it was the first received
issue new coin
returned to the mint
RERUM COGNOSCERE CAUSAS FIAT IUSTITIA ET PEREAT MUNDUS UBI BENE IBI PATRIA
"""


def tokenize(s: str) -> list[str]:
    return [t.lower() for t in re.split(r"[^a-zA-Z]+", s) if t]


def main() -> None:
    wl = get_wordlist()
    tokens = tokenize(CORPUS)
    hits: list[str] = []
    seen: set[str] = set()
    for t in tokens:
        if t in wl and t not in seen:
            seen.add(t)
            hits.append(t)

    # Also feed in every OCR token we extracted (low-confidence stuff filtered).
    ocr_path = HERE / "ocr_results" / "rapidocr.json"
    if ocr_path.exists():
        data = json.loads(ocr_path.read_text())
        for items in data.values():
            for it in items:
                if it["conf"] < 0.6:
                    continue
                for tok in tokenize(it["text"]):
                    if tok in wl and tok not in seen:
                        seen.add(tok)
                        hits.append(tok)

    print(f"BIP-39 candidate words found in corpus + OCR (n={len(hits)}):")
    for w in hits:
        print(f"  {w}")

    # Hint-confirmed words from the puzzle's published hint list
    print("\nUser-hint confirmed seed words:")
    confirmed = ["moon", "tower", "food", "real", "black", "this", "breathe"]
    for c in confirmed:
        mark = "BIP39" if c in wl else "NOT in BIP-39 list"
        print(f"  {c:10s}  -> {mark}")


if __name__ == "__main__":
    main()
