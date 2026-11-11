"""
Builds the Chrome Web Store kit in store-kit/ and release/frameshot-store-kit.zip:
  - renders store-kit/2-privacy-practices/privacy-policy.html from PRIVACY.md
  - copies the 5 screenshots, the promo tiles and the 128 px icon into store-kit/images/
  - checks the listing text against the store's limits and the manifest
Run from the repo root (after `npm run store:assets` if the UI changed):
  python3 scripts/build-store-kit.py
"""
import html
import json
import pathlib
import re
import shutil
import struct
import sys
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
KIT = ROOT / "store-kit"
IMAGES = KIT / "images"
problems = []


def check(cond, msg):
    if not cond:
        problems.append(msg)


# ── Listing text checks ──
name = (KIT / "1-store-listing/name.txt").read_text()
summary = (KIT / "1-store-listing/summary.txt").read_text()
description = (KIT / "1-store-listing/description.txt").read_text()
single = (KIT / "2-privacy-practices/single-purpose.txt").read_text()
check(len(name) <= 75, f"name is {len(name)} characters (max 75)")
check(len(summary) <= 132, f"summary is {len(summary)} characters (max 132)")
check(len(description) <= 16000, f"description is {len(description)} characters (max 16,000)")
check(len(single) <= 1000, f"single purpose is {len(single)} characters (max 1,000)")
for f in (KIT / "2-privacy-practices/permissions").glob("*.txt"):
    t = f.read_text()
    check(len(t) <= 1000, f"{f.name} is {len(t)} characters (max 1,000)")

manifest_path = ROOT / ".output/chrome-mv3/manifest.json"
if manifest_path.exists():
    manifest = json.loads(manifest_path.read_text())
    check(manifest["name"] == name, "name.txt differs from the manifest name")
    check(manifest["description"] == summary, "summary.txt differs from the manifest description")
    perms = set(manifest.get("permissions", []))
    files = {f.stem for f in (KIT / "2-privacy-practices/permissions").glob("*.txt")}
    check(perms == files, f"permission justifications {sorted(files)} != manifest {sorted(perms)}")
    check(not manifest.get("host_permissions"), "the manifest has host permissions; justify them")
else:
    problems.append("run `npm run build` first (manifest not found)")

# The store rejected 1.0.1 (violation "Red Nickel") for "Free" on the small
# tile: titles and images must not use words that mimic ranking, status or
# promotions ("free", "new", "#1", "premium", "recommended" and similar). The
# name, the summary, every promo tile and screenshot (their text is written in
# store-render.mjs and the demo pages they capture), and the popup UI shown in
# them are checked.
PROMO = re.compile(r"\b(free|new|premium|recommended|best|top[- ]rated|unlimited|no\.\s?1|number one|sale|discount|award)\b|#1\b", re.I)
for label, text in [("name", name), ("summary", summary)]:
    m = PROMO.search(text)
    check(not m, f'{label} uses the promotional word "{m.group(0) if m else ""}"')
def visible_text(src):
    # Strings a viewer can read: HTML text between tags and quoted labels, not JS keywords like `new Set`.
    parts = re.findall(r">([^<>{}$`]+)<", src) + re.findall(r"'([^'\n]{2,80})'", src)
    return " | ".join(parts)
for f in [ROOT / "scripts/store-render.mjs", ROOT / "src/popup/PopupApp.tsx", *sorted((ROOT / "store-assets/demo").glob("*.html"))]:
    for m in PROMO.finditer(visible_text(f.read_text())):
        problems.append(f'{f.relative_to(ROOT)} shows the promotional word "{m.group(0)}" (not allowed in store images)')
cap = (ROOT / "scripts/store-assets.mjs").read_text()
for typed in re.findall(r"keyboard\.type\('([^']*)'\)", cap):
    m = PROMO.search(typed)
    check(not m, f'store-assets.mjs types "{typed}" into a screenshot (promotional word "{m.group(0) if m else ""}")')

# A clear, well-written description. The store rejected an earlier version for
# "excessive keywords" over a list of file formats ("MP4, WebM, PNG, JPEG, WebP
# or PDF"), so lists of format names and long keyword runs are not allowed in
# any listing text, including the text drawn onto the screenshots.
FORMATS = r"(?:MP4|WebM|PNG|JPE?G|WebP|PDF|GIF|ZIP|SVG|BMP|MOV|AVI)"
check(11000 <= len(description) <= 13000, f"description is {len(description)} characters (target about 12,000: thorough, with how-to steps and an FAQ)")


def format_runs(text):
    """Two or more format names within a short span, e.g. "PNG, JPG or PDF"."""
    return re.findall(rf"\b{FORMATS}\b(?:[\s,/·&]+(?:or|and)?\s*\b{FORMATS}\b)+", text, re.I)


for label, text in [("name", name), ("summary", summary), ("description", description)]:
    for run in format_runs(text):
        problems.append(f'{label} lists file formats: "{run}"')
fmt_total = len(re.findall(rf"\b{FORMATS}\b", description, re.I))
check(fmt_total <= 6, f"description names file formats {fmt_total} times (keep it at 6 or fewer)")
for i, line in enumerate(description.splitlines(), 1):
    if len(re.findall(rf"\b{FORMATS}\b", line, re.I)) > 1:
        problems.append(f"description line {i} names more than one file format")
    for sentence in re.split(r"(?<=[.!?])\s+", line):
        if sentence.count(",") >= 4:
            problems.append(f'description line {i} has a long comma list: "{sentence[:70]}…"')
render_src = (ROOT / "scripts/store-render.mjs").read_text()
for run in format_runs(render_src):
    problems.append(f'screenshot text lists file formats: "{run}"')

# Exact search phrases stay at 5 or fewer; common words are reported, not capped
# (natural use in a long text is allowed, unnatural repetition is not).
TRACKED = ["screen recorder", "full page screenshot", "full-page capture", "screen capture", "record your screen", "screenshot tool", "screenshot editor", "watermark", "annotate", "free"]
counts = {k: len(re.findall(r"\b" + re.escape(k) + r"s?\b", description, re.I)) for k in TRACKED}
words = {w: len(re.findall(r"\b" + w + r"s?\b", description, re.I)) for w in ["screenshot", "capture", "record", "recording", "chrome", "browser"]}
for k, n in counts.items():
    check(n <= 5, f'"{k}" appears {n} times in the description (keep it at 5 or fewer)')

# ── Images ──
IMAGES.mkdir(parents=True, exist_ok=True)
shots = sorted((ROOT / "store-assets/screenshots").glob("0[1-5]-*.png"))
check(len(shots) == 5, f"expected 5 screenshots, found {len(shots)}")
copies = {f"screenshot-{i + 1}.png": p for i, p in enumerate(shots)}
copies["small-promo-440x280.png"] = ROOT / "store-assets/promo/small-440x280.png"
copies["marquee-1400x560.png"] = ROOT / "store-assets/promo/marquee-1400x560.png"
copies["icon-128.png"] = ROOT / "public/icon/128.png"
expected = {"small-promo-440x280.png": (440, 280), "marquee-1400x560.png": (1400, 560), "icon-128.png": (128, 128)}
for dst, src in copies.items():
    shutil.copyfile(src, IMAGES / dst)
    data = (IMAGES / dst).read_bytes()
    w, h, depth, color = struct.unpack(">IIBB", data[16:26])
    size = expected.get(dst, (1280, 800))
    check((w, h) == size, f"{dst} is {w}×{h}, expected {size[0]}×{size[1]}")
    if dst != "icon-128.png":
        check(color == 2, f"{dst} has an alpha channel; the store wants 24-bit PNG")

# ── Privacy policy page ──
def inline(t):
    t = html.escape(t)
    t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"\*(.+?)\*", r"<em>\1</em>", t)
    t = re.sub(r"`(.+?)`", r"<code>\1</code>", t)
    t = re.sub(r"\[(.+?)\]\((https?://[^)]+)\)", r'<a href="\2">\1</a>', t)
    return re.sub(r"\[(.+?)\]\(([^)]+)\)", r"\1", t)


out, para, items, rows = [], [], [], []


def flush():
    global para, items, rows
    if para:
        out.append("<p>" + inline(" ".join(para)) + "</p>")
    if items:
        out.append("<ul>" + "".join("<li>" + inline(i) + "</li>" for i in items) + "</ul>")
    if rows:
        cells = [[c.strip() for c in r.strip().strip("|").split("|")] for r in rows if not re.match(r"^\|[\s\-|:]+\|$", r.strip())]
        head = "<tr>" + "".join("<th>" + inline(c) + "</th>" for c in cells[0]) + "</tr>"
        body = "".join("<tr>" + "".join("<td>" + inline(c) + "</td>" for c in r) + "</tr>" for r in cells[1:])
        out.append(f"<table><thead>{head}</thead><tbody>{body}</tbody></table>")
    para, items, rows = [], [], []


for line in (ROOT / "PRIVACY.md").read_text().splitlines():
    if line.startswith("#"):
        flush()
        level = len(line) - len(line.lstrip("#"))
        out.append(f"<h{level}>{inline(line.lstrip('#').strip())}</h{level}>")
    elif line.startswith("|"):
        if para or items:
            flush()
        rows.append(line)
    elif re.match(r"^\s*[-*] ", line):
        if para or rows:
            flush()
        items.append(re.sub(r"^\s*[-*] ", "", line))
    elif not line.strip():
        flush()
    else:
        if items or rows:
            flush()
        para.append(line.strip())
flush()
check(not re.search(r"placeholder|to be added", " ".join(out), re.I), "PRIVACY.md still contains a placeholder")

STYLE = (
    "body{margin:0;font:16px/1.6 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#1b1b2b;background:#f6f6fa}"
    "main{max-width:760px;margin:0 auto;padding:40px 20px 64px}h1{font-size:30px;line-height:1.2;margin:0 0 8px}"
    "h2{font-size:20px;margin:32px 0 8px}table{width:100%;border-collapse:collapse;font-size:14px;margin:12px 0}"
    "th,td{border:1px solid #dcdce6;padding:8px 10px;text-align:left;vertical-align:top}th{background:#ececf4}"
    "code{background:#ececf4;padding:1px 5px;border-radius:5px;font-size:.9em}a{color:#4f46e5}footer{margin-top:40px;font-size:13px;color:#666}"
    "@media (prefers-color-scheme:dark){body{background:#0d0d14;color:#e8e8f0}th{background:#1b1b28}th,td{border-color:#2a2a3a}code{background:#1b1b28}a{color:#a5b4fc}}"
)
page = (
    '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n'
    f"<title>FrameShot privacy policy</title><style>{STYLE}</style></head><body><main>\n"
    + "\n".join(out)
    + '\n<footer>FrameShot is a product of Unique Labs, developed by <a href="https://www.shahriarahmed.net">Shahriar Ahmed</a>.</footer>\n</main></body></html>\n'
)
(KIT / "2-privacy-practices/privacy-policy.html").write_text(page)

if problems:
    print("Store kit has problems:")
    for p in problems:
        print("  -", p)
    sys.exit(1)

# ── Zip ──
zip_path = ROOT / "release/frameshot-store-kit.zip"
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
    for f in sorted(KIT.rglob("*")):
        if f.is_file():
            z.write(f, pathlib.Path("frameshot-store-kit") / f.relative_to(KIT))
print(f"Store kit OK: name {len(name)}/75, summary {len(summary)}/132, description {len(description)} characters (11,000–13,000)")
print("Phrase counts:", ", ".join(f"{k} {n}" for k, n in counts.items()), f"| file formats named: {fmt_total}")
print("Common words:", ", ".join(f"{k} {n}" for k, n in words.items()))
print(f"Wrote {zip_path.relative_to(ROOT)} ({zip_path.stat().st_size // 1024} KB)")
