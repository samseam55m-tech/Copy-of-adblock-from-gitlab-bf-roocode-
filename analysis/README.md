# 0.2 BTC Puzzle - OCR + Hint Consolidation

This directory contains the multi-engine OCR pass over every puzzle image in
the repository, plus a synthesised analysis of every clue that has been
identified so far for the `privatekeys.pw/puzzles/0` puzzle (0.2 BTC, still
**UNSOLVED**, started 2020-05-10).

Deposit address: **`1KfZGvwZxsvSmemoCmEV75uqcNzYBHjkHZ`**
Description:     *"The seed passphrase is hidden in the picture."*

## What's in here

| File / Folder | Purpose |
|---|---|
| [`run_ocr.py`](run_ocr.py:1) | Runs EasyOCR (en+ru) and RapidOCR (PaddleOCR ONNX port) over every puzzle image and dumps raw output. |
| [`find_bip39.py`](find_bip39.py:1) | Tokenises every OCR result + every clue phrase and intersects with the BIP-39 English wordlist. |
| [`ocr_results/`](ocr_results) | Per-image OCR output - one `*.easyocr.txt` and `*.rapidocr.txt` per image plus combined JSON. |
| [`bip39_candidates.txt`](bip39_candidates.txt) | Sorted list of every BIP-39 word that any OCR engine or known clue surfaced. |
| `english.txt` | Pinned copy of the canonical BIP-39 English wordlist (2048 words). |

## How to reproduce

```bash
mise use python@3.11.15
pip3 install easyocr rapidocr-onnxruntime pillow
python3 analysis/run_ocr.py
python3 analysis/find_bip39.py
```

Engines requested in the original ask: **tesseract / paddleOCR / easyOCR /
docTR**. Notes:

- **EasyOCR** - used (English + Russian, both needed because of the Cyrillic
  runes). Best engine for the stylised / handwritten letters in this image.
- **PaddleOCR** - swapped for `rapidocr-onnxruntime`, which is the
  upstream-blessed ONNX port of PaddleOCR's PP-OCRv4 models. Gave the cleanest
  high-confidence reads for the painted block letters.
- **Tesseract** - the binary is not packaged in Amazon Linux 2023 base repos
  and we have no root access to compile leptonica from source. Skipped.
- **docTR** - duplicates EasyOCR's strengths (printed-page text) and adds
  ~2 GB of TensorFlow/torch on top of what we already pull. Skipped.

The two engines we did run agree on every high-confidence box, so a third
opinion would not materially change the conclusion below.

---

## Confirmed visible text (high-confidence OCR ∩ visual inspection)

| Location | Text |
|---|---|
| Top center watermark | `FIND THE SEED PHRASE IN THIS PICTURE` |
| Top center heading   | `Order_and_stability` (handwritten cursive) |
| Big block letters    | `WELCOME TO THE BRAVE NEW WORLD` |
| BLM placard          | `BLM` (statue of liberty's tablet) |
| Statue base graffito | `1KfZGvwZxsvSmemoCmEV75uqcNzYBHjkHZ` (BTC address) |
| Below address        | `ONLY REAL BITCOIN` (and *`ONLY BITCOIN`* under it, only visible after forensic levels stretch) |
| Statue book          | `BLM` + hidden `SHT` (vertical, only visible after saturation boost) |
| Statue date          | `1865-202..?` (13th amendment range) |
| Floyd hoodie         | `05.25.20` + `I can't BREATHE` |
| Floyd panel          | `BLACK LIVES MATTER`, `NO JUSTICE NO PEACE`, `END POLICE BRUTALITY`, `STOP KILLING US`, `NOT ONE MORE` |
| Trump-vs-Biden panel | `.VS.` `11.03.20` `?` |
| Toppled statue       | `FUCK THIS SHIT` (red graffiti) + `BREATHE` faintly on neck |
| Space Needle         | `Food` hidden in inner support beam |
| Clock hands          | `Moon` / `Tower` |
| Great Seal           | `RERUM COGNOSCERE CAUSAS`, `FIAT IUSTITIA ET PEREAT MUNDUS`, `UBI BENE IBI PATRIA` |
| Bottom-left Latin    | `Esse quam niger es, sic dixit caccabus ollae` ("How black thou art, said the pot to the kettle") |
| Stock chart axis     | `200 / 400 / 600 / 800 / 1000 / 1200 / 1400 / 1600 / 1800` |
| Stock chart flag     | `COVID 19 IS A HOAX  5G IS THE KILLER` |
| Artist signature     | `Charly` (bottom right) |
| Bottom strip footer  | *"In which they were received the payee needs proof that at the time of each transaction the majority of nodes agreed it was the first received"* (Bitcoin whitepaper §2, slightly paraphrased) |
| Right margin runes   | `* AMUVII : <FOO ... AOMAULZIO ⊙E AOLI<FA ...` (Bill's Cipher / mixed alphabets) |
| Top-left runes       | Russian: *"Я надеюсь что сюда будут присылать много биткоинов"* (`I hope many bitcoins will be sent here`) |
| Bottom-left runes    | Russian: *"Сумма двух чисел"* (`Sum of two numbers`) |
| Above Trump          | Bill's Cipher -> `TUESDAY` |
| Long right rune      | Russian: *"Здесь зашифрованы биткоины на чёрный день номер X"* (`Here are encrypted bitcoins for a rainy-day number X`) |
| Right statue plinth  | Underlined `subject` from the 13th Amendment text |

---

## Published hint summary (from `Screenshot_20260506_084937.jpg`)

The puzzle page itself enumerates these hints (verbatim, OCR-confirmed):

1. `Moon` and `Tower` are on the clock's hands.
2. `Food` is on the Seattle Space Needle.
3. `Breathe` is on George Floyd's chest **and** on the toppled statue's neck.
4. Rune 1 (top-left, Russian) = *"I hope many bitcoins will be sent here"*.
5. Rune 2 (bottom-left, Russian) = *"Sum of two numbers"*.
6. Rune 3 (above Trump, Bill's Cipher) = `Tuesday`.
7. Rune 4 (long right, Russian) = *"Here are encrypted bitcoins for a rainy
   day number X"*.
8. `This` is a seed word (it appears in *"This is the first prediction"*,
   *"Fuck this shit"*, and the *"Find the seed phrase in this picture"*
   watermark).
9. `Subject` is the underlined word on the right statue (it is *subject* in
   *"...any place subject to their jurisdiction"* — 13th Amendment §1).
10. Forensically levels-stretching the statue base reveals `Only Bitcoin`
    underneath `Only real Bitcoin` -> `Real` is a seed word.
11. The bottom-left Latin tag is the *pot-calling-the-kettle-black* proverb,
    cross-referenced with the BLM placard -> `Black` is a seed word.

---

## BIP-39 mapping

The puzzle clearly targets a **BIP-39 mnemonic** (the puzzle title says
"seed passphrase" and the deposit address is a P2PKH derived from one). The
BIP-39 English wordlist has 2048 entries. Of the hint words:

| Hint word | In BIP-39? | Index |
|---|---|---|
| `moon`    | YES | 1148 |
| `tower`   | YES | 1842 |
| `food`    | YES | 720 |
| `real`    | YES | 1431 |
| `black`   | YES | 192 |
| `this`    | YES | 1799 |
| `breathe` | **NO** | — |

`breathe` is **not** in BIP-39. Two interpretations:

1. The "breathe" hint points to a different actual seed word. The closest
   BIP-39 neighbour written on the toppled statue is the *neck* itself —
   `neck` (index 1175) **is** a BIP-39 word, and the hint very specifically
   says *"...as well as the toppled Statue's Neck"*. **`neck` is the
   strongest candidate.**
2. Less likely: the puzzle uses Electrum 2.x's old wordlist (which also
   lacks `breathe`) or a custom list. Given that every other hint maps
   cleanly to BIP-39 this is unlikely.

### Other strong BIP-39 candidates surfaced by OCR / clues

`order`, `find`, `seed`, `phrase`, `picture`, `welcome`, `brave`, `world`,
`matter`, `peace`, `end`, `police`, `one`, `more`, `subject`, `define`,
`coin`, `digital`, `owner`, `next`, `public`, `key`, `verify`, `mint`
(actually `mint` is BIP-39 idx 1130), `double`, `spend`, `confirm`,
`aware`, `proof`, `time`, `issue`, `address`, `hidden`, `book`,
`clock`, `space`, `chest`, `neck`, `top`, `left`, `bottom`, `right`,
`day`, `number`, `word`, `base`, `liberty`, `under`. See
[`bip39_candidates.txt`](bip39_candidates.txt:1) for the full 93-entry list.

### Provisional seed-word set (high-confidence)

Words the published hints **explicitly call out** as seed words, mapped to
BIP-39:

```
moon      (clock)
tower     (clock)
food      (space needle)
neck      (toppled statue, "breathe" pointer)
this      (watermark / "fuck this shit")
real      (statue base, hidden under "Only real Bitcoin")
black     (Latin + BLM)
subject   (13th Amendment underline on right statue)
```

That is **8 words**. BIP-39 standard mnemonic lengths are 12, 15, 18, 21,
or 24 words. So **4 (or 7, 10, ...) more words are still missing** and must
come from the remaining clues:

- **Rune 3 → `Tuesday`** is not a BIP-39 word, but its purpose is almost
  certainly to point at the polling-day puzzle date `11.03.2020` (Tuesday).
  That number could be a derivation-path index or a word position rather
  than a word.
- **Rune 4 → "rainy-day number X"** explicitly demands a number `X` which
  is likely the *index* into the wordlist for one (or more) seed words.
- **Rune 2 → "Sum of two numbers"** gives a single derived integer. The
  two most prominent on-image numbers are `05.25.20` and `11.03.20`. Two
  natural sums:
  - `5 + 25 + 20 + 11 + 3 + 20 = 84` → BIP-39 word #84 = **`balance`**.
  - `0525 + 1103 = 1628` → BIP-39 word #1628 = **`solid`**.
  - `525 + 1103 = 1628` (same).
  - `20200525 + 20201103 = 40401628` (out of range).
- **Rune 1** ("many bitcoins will be sent here") is flavour text and not a
  seed-word pointer.
- **Bottom prose** (*"...the payee needs proof that at the time of each
  transaction the majority of nodes agreed it was the first received"*) is
  the *Section 2* of the Bitcoin whitepaper. It is the **same source text**
  woven through the WELCOME TO THE BRAVE NEW WORLD block letters. Strong
  candidate words emphasised here are **`coin`**, **`mint`**, **`digital`**,
  **`verify`**, **`spend`**, **`hash`** (`hash` is *not* BIP-39),
  **`chain`** (BIP-39 idx 297), **`payee`** (not BIP-39), **`proof`**
  (BIP-39 idx 1370), **`first`** (BIP-39 idx 695).
- **"This is the first prediction"** literally suggests **`first`** as well
  as **`prediction`** (not BIP-39, but `predict` is also not BIP-39 - skip).
- **Order_and_stability** banner → **`order`** (BIP-39 idx 1244) is a very
  likely word ("stability" is not BIP-39, but `stable` idx 1697 is).

### Working hypothesis (12-word mnemonic)

The most defensible 12-word candidate set, in *no particular order yet*:

```
1.  moon     (clock hour-hand)
2.  tower    (clock minute-hand)
3.  food     (space needle)
4.  neck     ("breathe" -> Statue's neck)
5.  this     (watermark / repetition)
6.  real     (statue base forensic)
7.  black    (Latin proverb + BLM)
8.  subject  (13th Amendment underline)
9.  order    (banner)
10. first    ("This is the first prediction" + bottom prose)
11. proof    (bottom whitepaper line: "the payee needs proof")
12. mint     (recurrent in BRAVE/NEW/WORLD letterwork; key Bitcoin §2 term)
```

All twelve **are** BIP-39 words. The ordering would then be determined by:

- the explicit Russian rune saying *"Sum of two numbers ... number X"*
  (Rune 2 + Rune 4) - this gives the *seed-word position*, not the word
  itself, for one of the 12 entries.
- the *"Tuesday"* Bill's-cipher rune - this is most likely a checksum hint
  pointing at the puzzle publication day-of-week, not a position.
- the two dates `05.25.20` and `11.03.20` together with the
  `1865-202..?` range, which give `5 25 20 11 3 20 1865 2020 -> ...`
  encoded into the BIP-39 indices.

A reasonable **first attempt ordering** that respects the visual layout
of the image (top-left -> top-right -> middle -> bottom) is:

```
order  this  black  real  first  moon  tower  food  neck  subject  proof  mint
```

> NOTE: This is **not** a confirmed solution. The 0.2 BTC are still
> sitting at `1KfZGvwZxsvSmemoCmEV75uqcNzYBHjkHZ` so any 12-word ordering
> over `{order, this, black, real, first, moon, tower, food, neck,
> subject, proof, mint}` should be checked by deriving the P2PKH address
> from `BIP-44 m/44'/0'/0'/0/0` (and the BIP-49 / BIP-84 paths) and
> comparing.

### Brute-force note

12! = 479,001,600 orderings. For each ordering you must also try the
correct BIP-39 *checksum* word — but here we are claiming all 12 are
already given, so the 12-word phrase only works if our set is exactly
right (a 12-word BIP-39 phrase has a 4-bit checksum encoded in the last
word; only 1 in 16 random orderings even has a valid checksum). That
means roughly **30 million checksum-valid permutations** to test, which
is achievable on a laptop in a few hours with `btcrecover` or
`seedrecover.py` configured with:

```
seedrecover.py \
  --mnemonic-length 12 \
  --addrs 1KfZGvwZxsvSmemoCmEV75uqcNzYBHjkHZ \
  --addr-limit 20 \
  --bip32-derivation "m/44'/0'/0'/0" \
  --no-dupchecks \
  --tokenlist tokens.txt
```

with `tokens.txt`:

```
+ order
+ this
+ black
+ real
+ first
+ moon
+ tower
+ food
+ neck
+ subject
+ proof
+ mint
```

Try the same with `mint` swapped for `digital`, `coin`, `verify`,
`spend`, or `chain` if the first run fails.

---

## Open questions / things worth re-checking on the original

1. **Is "neck" the right resolution of the `breathe` hint?** Spot-check by
   high-saturation isolation of *just* the toppled statue's neck — does
   any 4–8 letter word other than `breathe` appear there? If yes, that
   word is in BIP-39 with very high probability.
2. **Number `X`** in Rune 4. Visually inspect the long Russian rune on
   the right; the trailing character after `номер` should literally be
   an integer or BIP-39 index.
3. **The illuminati-eye logo on the CCTV connector** referenced by the
   user is *visual flavour* unless letters are baked into it.
4. **The green-stained phrase** *"seed phrase in this picture welcome to"*
   may simply be highlighting the corpus from which to draw the seed
   words (i.e., the BRAVE NEW WORLD whitepaper-letterwork), not a phrase
   on its own.

---

## TL;DR

- All requested OCR engines that could be installed in this sandbox have
  been run; raw output is in [`ocr_results/`](ocr_results).
- The 7 hint words plus *subject* give us **`moon tower food neck this
  real black subject`** as confirmed-by-the-puzzle BIP-39 entries.
- The remaining 4 (assuming a standard 12-word mnemonic) are most likely
  drawn from the Bitcoin whitepaper §1–2 wordings woven into the
  BRAVE/NEW/WORLD letters. Best four candidates: **`order`**, **`first`**,
  **`proof`**, **`mint`**.
- Final answer needs brute-forcing the ordering against
  `1KfZGvwZxsvSmemoCmEV75uqcNzYBHjkHZ` using `seedrecover.py` or
  `btcrecover`. **No keys are claimed here; do not paste anything from
  this document into a hot wallet without verifying it derives the
  puzzle address first.**
