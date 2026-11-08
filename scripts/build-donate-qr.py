# Builds the donation QR codes (FrameShot indigo) as SVG and proves each one
# decodes to the exact address (rendered to PNG and read back with OpenCV).
# The addresses must match src/core/donate.ts (a unit test checks this).
# Run from the repo root:
#   pip install segno opencv-python-headless && python3 scripts/build-donate-qr.py
import io, sys
import segno, cv2, numpy as np

WALLETS = {
    "evm": "0x257F291514AaAa1533832cC2C8981Cc14063ED17",
    "sol": "GwwZWYxzms9ebEWQNCAJrPSQdsN6SVPGbpMwCYomWqWa",
    "btc": "bc1qg6clyevlmfekg3rkyhlk5ggeh3g6dnt5sdje4j",
}
DARK = "#1E1B4B"

ok = True
for name, addr in WALLETS.items():
    qr = segno.make(addr, error="m", micro=False)
    qr.save(f"public/donate/qr-{name}.svg", scale=6, border=2, dark=DARK, light="#FFFFFF", xmldecl=False, svgns=True, title=f"{name.upper()} donation address")
    buf = io.BytesIO()
    qr.save(buf, kind="png", scale=8, border=4, dark=DARK, light="#FFFFFF")
    img = cv2.imdecode(np.frombuffer(buf.getvalue(), np.uint8), cv2.IMREAD_GRAYSCALE)
    text, _, _ = cv2.QRCodeDetector().detectAndDecode(img)
    match = text == addr
    ok &= match
    print(f"{name}: version={qr.version} decoded={text!r} match={match}")
sys.exit(0 if ok else 1)
