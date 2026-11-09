#!/usr/bin/env python3
"""
FrameShot showcase soundtrack, synthesized from scratch: no samples and no
licensed music, so the video can be used anywhere.

    python3 scripts/video/music.py scripts/video/timeline.json .output/video/music.wav

120 BPM in C major / A minor, 60 bars (2 minutes). Scene changes in the video
fall on bar lines; risers and impacts lead into the big moments, and quiet UI
sounds (clicks, key presses, the shutter, the countdown) follow timeline.json.
"""
import json
import sys
import wave

import numpy as np
from scipy import signal

SR = 48000
TL = json.load(open(sys.argv[1]))
OUT = sys.argv[2]
DUR = float(TL['duration'])
N = int(SR * DUR)
BPM = TL['bpm']
BEAT = 60.0 / BPM
BAR = 4 * BEAT
STEP = BEAT / 4
NBARS = int(round(DUR / BAR))
rng = np.random.default_rng(20261109)


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def lp(fc, order=2):
    return signal.butter(order, min(fc, SR * 0.45), 'low', fs=SR, output='sos')


def hp(fc, order=2):
    return signal.butter(order, fc, 'high', fs=SR, output='sos')


def bp(lo, hi, order=2):
    return signal.butter(order, [lo, min(hi, SR * 0.45)], 'band', fs=SR, output='sos')


class Bus:
    def __init__(self):
        self.x = np.zeros((2, N))

    def add(self, t, sig, pan=0.0, gain=1.0):
        i = int(round(t * SR))
        if sig.ndim == 1:
            th = (pan + 1) * np.pi / 4
            st = np.stack([sig * np.cos(th), sig * np.sin(th)]) * (gain * np.sqrt(2))
        else:
            st = sig * gain
        if i < 0:
            st = st[:, -i:]
            i = 0
        n = st.shape[1]
        if i >= N or n == 0:
            return
        e = min(N, i + n)
        self.x[:, i:e] += st[:, : e - i]


def env(n, a, d, s, r, hold):
    t = np.arange(n) / SR
    h = max(a + d, hold)
    return np.interp(t, [0, a, a + d, h, h + r], [0, 1, s, s, 0])


def additive(freq, n, kmax=6000.0, slope=1.0, odd=False, decay=None, cents=0.0, vib=None, seed=None):
    """Band-limited oscillator built from harmonics (no aliasing). decay=(d0, d1) fades upper
    harmonics faster, like a filter envelope; vib=(rate, depth_cents, delay)."""
    f = freq * 2 ** (cents / 1200)
    t = np.arange(n) / SR
    if vib:
        rate, depth, delay = vib
        dep = depth * np.clip((t - delay) / 0.25, 0, 1)
        phi = 2 * np.pi * np.cumsum(f * 2 ** (dep * np.sin(2 * np.pi * rate * t) / 1200)) / SR
    else:
        phi = 2 * np.pi * f * t
    K = max(1, int(min(kmax, SR * 0.45) / f))
    k = np.arange(1, K + 1, dtype=float)
    if odd:
        k = k[k % 2 == 1]
    amp = 1.0 / k ** slope
    g = np.random.default_rng(seed) if seed is not None else rng
    ph = g.uniform(0, 2 * np.pi, len(k))
    out = np.zeros(n)
    for j in range(0, len(k), 8):
        kk, aa, pp = k[j : j + 8], amp[j : j + 8], ph[j : j + 8]
        s = np.sin(np.outer(phi, kk) + pp)
        if decay is not None:
            s *= np.exp(-np.outer(t, decay[0] + decay[1] * (kk - 1)))
        out += s @ aa
    return out


def noise(n):
    return rng.standard_normal(n)


# ── Harmony ──────────────────────────────────────────────────────────────
CH = {
    'Am7': [57, 60, 64, 67],
    'Fmaj7': [53, 57, 60, 64],
    'Cadd9': [55, 60, 62, 64],
    'G6': [55, 59, 62, 64],
    'G': [55, 59, 62, 67],
    'Em7': [52, 55, 59, 62],
    'Cmaj9': [48, 55, 59, 62, 64],
}
ROOT = {'Am7': 33, 'Fmaj7': 29, 'Cadd9': 36, 'G6': 31, 'G': 31, 'Em7': 28, 'Cmaj9': 36}
A = ['Am7', 'Fmaj7', 'Cadd9', 'G6']
B = ['Fmaj7', 'G', 'Em7', 'Am7']
PROG = A * 4 + B * 3 + A + B * 3 + A * 2 + B + ['Fmaj7', 'G6', 'Cmaj9', 'Cmaj9']
assert len(PROG) == NBARS, len(PROG)


def section(b):
    if b < 4:
        return 'intro'
    if b < 12:
        return 'verse'
    if b < 16:
        return 'verse2'
    if b < 28:
        return 'chorus'
    if b < 32:
        return 'break'
    if b < 44:
        return 'drop'
    if b < 52:
        return 'groove'
    if b < 56:
        return 'soft'
    return 'outro'


# ── Drums ────────────────────────────────────────────────────────────────
def kick_sample():
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    f = 46 + (155 - 46) * np.exp(-t / 0.032)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.3)
    body = np.tanh(body * 1.6) / np.tanh(1.6)
    click = signal.sosfilt(hp(1800), noise(n)) * np.exp(-t / 0.004) * 0.22
    return body + click


def clap_sample():
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    nz = signal.sosfilt(bp(900, 2600), noise(n))
    e = np.zeros(n)
    for dly in (0.0, 0.010, 0.021):
        e += np.where(t >= dly, np.exp(-np.clip(t - dly, 0, None) / 0.0065), 0)
    e += np.where(t >= 0.03, 0.55 * np.exp(-np.clip(t - 0.03, 0, None) / 0.13), 0)
    return nz * e / 2.2


def hat_sample(open_=False):
    n = int((0.42 if open_ else 0.08) * SR)
    t = np.arange(n) / SR
    nz = signal.sosfilt(hp(7200, 3), noise(n))
    metal = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in (5410, 6890, 8120)) * 0.08
    return (nz + signal.sosfilt(hp(6000), metal)) * np.exp(-t / (0.14 if open_ else 0.02))


def crash_sample():
    n = int(2.6 * SR)
    t = np.arange(n) / SR
    nz = signal.sosfilt(hp(3500, 2), noise(n)) * np.exp(-t / 0.75)
    shimmer = signal.sosfilt(bp(5000, 12000), noise(n)) * np.exp(-t / 1.3) * 0.5
    return (nz + shimmer) * np.minimum(1, t / 0.002)


KICK, CLAP, HAT, OHAT, CRASH = kick_sample(), clap_sample(), hat_sample(), hat_sample(True), crash_sample()

drums = Bus()
kicks = Bus()
kick_times = []
for b in range(NBARS):
    s = section(b)
    t0 = b * BAR
    four = s in ('verse', 'verse2', 'chorus', 'drop', 'groove') or (s == 'outro' and b < 58)
    half = s == 'soft'
    for step in range(16):
        t = t0 + step * STEP
        if (four and step % 4 == 0) or (half and step in (0, 8)):
            kicks.add(t, KICK, gain={'verse': 0.78, 'verse2': 0.88, 'soft': 0.6}.get(s, 1.0))
            kick_times.append(t)
        if s in ('verse2', 'chorus', 'drop', 'groove') and step in (4, 12):
            drums.add(t, CLAP, pan=0.05, gain=0.42)
        if s in ('verse', 'verse2', 'chorus', 'drop', 'groove') and step % 4 == 2:
            drums.add(t, HAT, pan=0.25, gain=0.16 * rng.uniform(0.85, 1.0))
        if s in ('chorus', 'drop') and step % 2 == 1:
            drums.add(t, HAT, pan=-0.2, gain=0.07 * rng.uniform(0.7, 1.0))
        if s in ('chorus', 'drop', 'groove') and step == 14 and b % 2 == 1:
            drums.add(t, OHAT, pan=0.3, gain=0.09)
    # Snare roll into the drop (bar 32 = 62–64 s) and a small fill into the chorus.
    if b == 31:
        for i in range(32):
            frac = i / 31
            drums.add(t0 + i * (BAR / 32), CLAP, pan=rng.uniform(-0.2, 0.2), gain=0.08 + 0.3 * frac ** 2)
    if b == 15:
        for i in range(8):
            drums.add(t0 + 3 * BEAT + i * (BEAT / 8), CLAP, gain=0.12 + 0.18 * i / 7)
for bar_time in (8.0, 32.0, 64.0, 88.0, 112.0, 116.0):
    drums.add(bar_time, CRASH, pan=-0.15, gain=0.22)

# Sidechain: pads, bass and arp dip on every kick.
duck = np.ones(N)
sc_len = int(0.38 * SR)
sc_t = np.arange(sc_len) / SR
for tk in kick_times:
    i = int(tk * SR)
    seg = 1 - 0.55 * np.exp(-sc_t / 0.11)
    e = min(N, i + sc_len)
    duck[i:e] = np.minimum(duck[i:e], seg[: e - i])

# ── Bass ─────────────────────────────────────────────────────────────────
bass = Bus()
for b in range(NBARS):
    s = section(b)
    if s in ('intro', 'break'):
        continue
    if s == 'outro' and b >= 58:
        continue
    root = ROOT[PROG[b]]
    t0 = b * BAR
    steps = [2, 6, 10, 14] if s in ('verse', 'verse2', 'groove') else [2, 6, 10, 14, 3, 11]
    if s == 'soft':
        steps = [0, 8]
    for step in steps:
        ghost = step in (3, 11)
        long_note = s == 'soft'
        dur = (BAR / 2 - 0.05) if long_note else (0.11 if ghost else 0.2)
        n = int((dur + 0.06) * SR)
        f = mtof(root + 12)
        sub = np.sin(2 * np.pi * f * np.arange(n) / SR)
        saw = additive(f, n, kmax=2600, decay=(2.2, 1.6))
        e = env(n, 0.004, 0.05, 0.85, 0.05, dur)
        v = (0.55 if ghost else 1.0) * {'verse': 0.8, 'verse2': 0.9, 'soft': 0.7}.get(s, 1.0)
        bass.add(t0 + step * STEP, (0.5 * sub + 0.32 * saw) * e * v)

# ── Pads ─────────────────────────────────────────────────────────────────
pad = Bus()
for b in range(NBARS):
    s = section(b)
    notes = CH[PROG[b]]
    t0 = b * BAR
    hold = BAR + (2 * BAR if b == NBARS - 2 else 0)
    if b == NBARS - 1:
        continue
    n = int((hold + 0.9) * SR)
    e = env(n, 0.35 if b else 1.4, 0.4, 0.8, 0.85, hold)
    bright = {'intro': 2600, 'break': 3800, 'chorus': 5200, 'drop': 5600, 'outro': 3800}.get(s, 4200)
    L = np.zeros(n)
    R = np.zeros(n)
    for m in notes:
        f = mtof(m)
        L += additive(f, n, kmax=bright, slope=1.15, cents=-9) + 0.7 * additive(f, n, kmax=bright, slope=1.15, cents=3)
        R += additive(f, n, kmax=bright, slope=1.15, cents=9) + 0.7 * additive(f, n, kmax=bright, slope=1.15, cents=-3)
    pad.add(t0, np.stack([L * e, R * e]), gain=0.045)

# A filter sweep on the pads: dark intro, opening build into the drop, closing at the end.
cut_t = [0, 8, 24, 32, 56, 63.8, 64, 104, 112, 120]
cut_v = [700, 2400, 2600, 4800, 900, 6500, 5200, 3200, 3600, 900]
pad_cut = np.interp(np.arange(N) / SR, cut_t, cut_v)


def sweep(x, cutoff, block=2048):
    """Low-pass with a moving cutoff (block-wise, filter state carried across blocks)."""
    y = np.zeros_like(x)
    zi = [np.zeros((1, 2)), np.zeros((1, 2))]
    for i in range(0, x.shape[1], block):
        sos = lp(float(cutoff[i]), 2)
        for c in range(2):
            y[c, i : i + block], zi[c] = signal.sosfilt(sos, x[c, i : i + block], zi=zi[c])
    return y


pad.x = sweep(pad.x, pad_cut)

# ── Arpeggio (plucks with a ping-pong delay) ─────────────────────────────
arp = Bus()
PATTERN = [0, 1, 2, 3, 4, 3, 2, 1, 0, 2, 3, 4, 5, 4, 3, 2]
for b in range(NBARS):
    s = section(b)
    if s == 'outro' and b >= 58:
        continue
    notes = sorted(CH[PROG[b]])[:4]
    tones = [m + 12 for m in notes] + [notes[0] + 24, notes[1] + 24]
    t0 = b * BAR
    lvl = {'intro': 0.5, 'verse': 0.8, 'verse2': 0.85, 'chorus': 0.75, 'break': 0.6, 'drop': 0.75, 'groove': 1.0, 'soft': 0.55, 'outro': 0.6}[s]
    for step in range(16):
        m = tones[PATTERN[step]]
        n = int(0.42 * SR)
        x = additive(mtof(m), n, kmax=7000, decay=(5.5, 1.6)) * env(n, 0.002, 0.3, 0.0, 0.05, 0.35)
        accent = 1.0 if step % 4 == 0 else 0.72
        arp.add(t0 + step * STEP, x, pan=0.18 if step % 2 else -0.18, gain=0.06 * lvl * accent)
# The arp also opens up over the intro and the break.
arp_cut = np.interp(np.arange(N) / SR, [0, 7.8, 8, 56, 63.8, 64, 120], [1200, 5200, 7000, 1400, 7000, 9000, 4000])
arp.x = sweep(arp.x, arp_cut)


def pingpong(x, delay_s, fb, taps=5):
    y = x.copy()
    d = int(delay_s * SR)
    for i in range(1, taps + 1):
        src = x[0] + x[1]
        ch = i % 2
        g = fb ** i * 0.5
        y[ch, i * d :] += src[: N - i * d] * g
    return y


arp.x = arp.x + 0.6 * (pingpong(arp.x, 3 * STEP, 0.45) - arp.x)

# ── Lead hook (choruses and the drop) ────────────────────────────────────
lead = Bus()
HOOK = {
    'Fmaj7': [(0, 69, 2), (2, 72, 2), (4, 76, 4), (8, 74, 2), (10, 72, 2), (12, 69, 4)],
    'G': [(0, 71, 2), (2, 74, 2), (4, 79, 4), (8, 76, 2), (10, 74, 2), (12, 71, 4)],
    'Em7': [(0, 67, 2), (2, 71, 2), (4, 76, 4), (8, 74, 2), (10, 71, 2), (12, 67, 4)],
    'Am7': [(0, 69, 2), (2, 72, 2), (4, 76, 2), (6, 79, 2), (8, 81, 6)],
    'Am7-end': [(0, 76, 2), (2, 74, 2), (4, 72, 2), (6, 71, 2), (8, 69, 8)],
}
for b in range(NBARS):
    s = section(b)
    if s not in ('chorus', 'drop', 'soft'):
        continue
    ch = PROG[b]
    key = ch
    loop_pos = (b - (16 if s == 'chorus' else 32 if s == 'drop' else 52)) // 4
    if ch == 'Am7' and loop_pos % 2 == 1:
        key = 'Am7-end'
    t0 = b * BAR
    octave = 12 if (s == 'drop' and loop_pos >= 1) else 0
    lvl = {'chorus': 0.13, 'drop': 0.15, 'soft': 0.09}[s]
    for step, m, length in HOOK[key]:
        dur = length * STEP
        n = int((dur + 0.35) * SR)
        f = mtof(m + octave)
        x = 0.65 * additive(f, n, kmax=6500, odd=True, decay=(1.0, 0.7), vib=(5.5, 14, 0.18)) + 0.45 * additive(f, n, kmax=5000, decay=(1.4, 0.9), cents=6)
        x *= env(n, 0.004, 0.22, 0.5, 0.18, dur)
        lead.add(t0 + step * STEP, x, pan=-0.08, gain=lvl)
        if s == 'drop':
            lead.add(t0 + step * STEP, additive(mtof(m + octave - 12), n, kmax=3000, decay=(1.6, 1.0)) * env(n, 0.006, 0.2, 0.4, 0.15, dur), pan=0.2, gain=lvl * 0.35)
lead.x = lead.x + 0.5 * (pingpong(lead.x, 2 * STEP, 0.35, taps=4) - lead.x)

# ── Effects: risers, impacts, downlifter ─────────────────────────────────
fx = Bus()


def riser(length, peak=1.0):
    n = int(length * SR)
    t = np.arange(n) / SR
    nz = noise(n)
    y = np.zeros(n)
    zi = np.zeros((2, 2))
    block = 1024
    for i in range(0, n, block):
        c = 400 * (14000 / 400) ** (i / n)
        sos = bp(c * 0.6, min(c * 1.6, 20000))
        y[i : i + block], zi = signal.sosfilt(sos, nz[i : i + block], zi=zi)
    tone = np.sin(2 * np.pi * np.cumsum(220 * 2 ** (2.2 * t / length)) / SR) * 0.25
    return (y + tone) * (t / length) ** 2.2 * peak


def impact():
    n = int(2.2 * SR)
    t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * np.cumsum(32 + 50 * np.exp(-t / 0.08)) / SR) * np.exp(-t / 0.6)
    burst = signal.sosfilt(lp(3000), noise(n)) * np.exp(-t / 0.18) * 0.4
    return boom + burst


def downlifter(length=2.0):
    n = int(length * SR)
    t = np.arange(n) / SR
    nz = signal.sosfilt(bp(300, 6000), noise(n))
    tone = np.sin(2 * np.pi * np.cumsum(880 * 2 ** (-3 * t / length)) / SR) * 0.2
    return (nz * 0.6 + tone) * np.exp(-t / (length / 3)) * np.minimum(1, t / 0.015)


for end, length, g in ((8.0, 4.0, 0.16), (32.0, 2.0, 0.1), (64.0, 6.0, 0.2)):
    fx.add(end - length, riser(length), gain=g)
for t in (8.0, 32.0, 64.0, 116.0):
    fx.add(t, impact(), gain=0.5 if t != 32.0 else 0.32)
fx.add(104.0, downlifter(2.4), gain=0.12)

# ── UI sounds from the timeline ─────────────────────────────────────────
sfx = Bus()


def click_s():
    n = int(0.05 * SR)
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * 2300 * t) * np.exp(-t / 0.006) * 0.7 + signal.sosfilt(hp(3000), noise(n)) * np.exp(-t / 0.003) * 0.5


def key_s():
    n = int(0.09 * SR)
    t = np.arange(n) / SR
    return signal.sosfilt(bp(500, 2200), noise(n)) * np.exp(-t / 0.018) * 0.9 + np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.03) * 0.5


def tap_s():
    n = int(0.06 * SR)
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * 1500 * t) * np.exp(-t / 0.01) * 0.6


def shutter_s():
    n = int(0.25 * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for d0 in (0.0, 0.075):
        tt = np.clip(t - d0, 0, None)
        on = t >= d0
        out += on * (signal.sosfilt(bp(1200, 7000), noise(n)) * np.exp(-tt / 0.012) + np.sin(2 * np.pi * 130 * tt) * np.exp(-tt / 0.02) * 0.6)
    return out


def tick_s(f):
    n = int(0.18 * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t)) * np.exp(-t / 0.05) * np.minimum(1, t / 0.002)


def chime_s():
    n = int(1.4 * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for d0, f in ((0.0, mtof(88)), (0.09, mtof(95))):
        tt = np.clip(t - d0, 0, None)
        out += (t >= d0) * np.sin(2 * np.pi * f * tt + 1.2 * np.exp(-tt / 0.15) * np.sin(2 * np.pi * f * 3.5 * tt)) * np.exp(-tt / 0.35)
    return out * 0.6


def whoosh_s(length=0.8):
    n = int(length * SR)
    t = np.arange(n) / SR
    nz = noise(n)
    y = np.zeros(n)
    zi = np.zeros((2, 2))
    for i in range(0, n, 512):
        p = i / n
        c = 500 + 2600 * np.sin(np.pi * p) ** 1.5
        y[i : i + 512], zi = signal.sosfilt(bp(c * 0.6, c * 1.5), nz[i : i + 512], zi=zi)
    shape = np.sin(np.pi * t / length) ** 2
    pan = np.linspace(-0.7, 0.7, n)
    th = (pan + 1) * np.pi / 4
    return np.stack([y * shape * np.cos(th), y * shape * np.sin(th)]) * np.sqrt(2)


S = TL['sfx']
for t in S['click']:
    sfx.add(t, click_s(), gain=0.09)
for t in S['key']:
    sfx.add(t, key_s(), pan=-0.1, gain=0.11)
for t in S['tap']:
    sfx.add(t, tap_s(), pan=0.1, gain=0.06)
for t in S['shutter']:
    sfx.add(t, shutter_s(), gain=0.16)
for i, t in enumerate(S['tick']):
    sfx.add(t, tick_s(1320 if i < 2 else 1760), gain=0.08)
for t in S['chime']:
    sfx.add(t, chime_s(), gain=0.07)
for t in S['whoosh']:
    sfx.add(t - 0.55, whoosh_s(0.8), gain=0.05)

# ── Reverb (stereo, decorrelated noise tail) ─────────────────────────────
def reverb_ir(rt60=1.9, length=2.6, predelay=0.022):
    n = int(length * SR)
    t = np.arange(n) / SR
    decay = np.exp(-6.9 * t / rt60)
    irs = []
    for _ in range(2):
        nz = noise(n) * decay
        nz = signal.sosfilt(lp(6500), nz)
        nz = np.concatenate([np.zeros(int(predelay * SR)), nz])
        irs.append(nz / np.sqrt(np.sum(nz ** 2)))
    return irs


IR = reverb_ir()
STEMS = {'kick': kicks.x, 'perc': drums.x, 'bass': bass.x * duck, 'pad': pad.x * duck, 'arp': arp.x * (0.6 + 0.4 * duck), 'lead': lead.x, 'fx': fx.x, 'sfx': sfx.x}
if len(sys.argv) > 3:  # optional: save the stems for mix experiments
    import os

    os.makedirs(sys.argv[3], exist_ok=True)
    for k, v in STEMS.items():
        np.save(f'{sys.argv[3]}/{k}.npy', v.astype(np.float32))
    np.save(f'{sys.argv[3]}/ir.npy', np.stack(IR).astype(np.float32))
# Levels in dB, set by measuring each stem in the drop (64–80 s) and the band balance of the mix.
GAIN_DB = {'kick': -10.5, 'perc': 0.5, 'bass': -6.5, 'pad': 7.0, 'arp': 11.0, 'lead': 6.5, 'fx': -1.0, 'sfx': 0.0}
SEND = {'kick': 0.0, 'perc': 0.06, 'bass': 0.0, 'pad': 0.35, 'arp': 0.45, 'lead': 0.32, 'fx': 0.5, 'sfx': 0.12}
g = {k: 10 ** (v / 20) for k, v in GAIN_DB.items()}
dry = sum(STEMS[k] * g[k] for k in STEMS)
send = sum(STEMS[k] * g[k] * SEND[k] for k in STEMS)
wet = np.stack([signal.fftconvolve(send[c], IR[c])[:N] for c in range(2)])


def level(x, t0, t1):
    seg = x[:, int(t0 * SR) : int(t1 * SR)].mean(axis=0)
    return 20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-12)


for k in STEMS:
    print(f'  {k:5s} drop {level(STEMS[k] * g[k], 64, 80):6.1f} dB   intro {level(STEMS[k] * g[k], 0, 8):6.1f} dB')

# ── Mix and master ───────────────────────────────────────────────────────
mix = dry + wet * 0.5
mix = signal.sosfilt(hp(30), mix, axis=1)


def shelf(f0, gain_db, high=True):
    """RBJ shelving filter (slope 1)."""
    A = 10 ** (gain_db / 40)
    w0 = 2 * np.pi * f0 / SR
    c, sa = np.cos(w0), 2 * np.sqrt(A) * np.sin(w0) / 2 * np.sqrt(2)
    if high:
        b = [A * ((A + 1) + (A - 1) * c + sa), -2 * A * ((A - 1) + (A + 1) * c), A * ((A + 1) + (A - 1) * c - sa)]
        a = [(A + 1) - (A - 1) * c + sa, 2 * ((A - 1) - (A + 1) * c), (A + 1) - (A - 1) * c - sa]
    else:
        b = [A * ((A + 1) - (A - 1) * c + sa), 2 * A * ((A - 1) - (A + 1) * c), A * ((A + 1) - (A - 1) * c - sa)]
        a = [(A + 1) + (A - 1) * c + sa, -2 * ((A - 1) + (A + 1) * c), (A + 1) + (A - 1) * c - sa]
    return np.array(b) / a[0], np.array(a) / a[0]


# Tone: a little more presence, a little less sub (measured against a typical mix balance).
for f0, gdb, high in ((1800, 4.5, True), (60, -2.5, False)):
    b_, a_ = shelf(f0, gdb, high)
    mix = signal.lfilter(b_, a_, mix, axis=1)

# Gentle glue compression (2:1 above the loud passages' typical level, 60 ms smoothing).
win = int(0.03 * SR)
rms = np.sqrt(np.convolve(mix.mean(axis=0) ** 2, np.ones(win) / win, mode='same') + 1e-12)
thr = np.percentile(rms, 80)
gain = np.where(rms > thr, (rms / thr) ** (1 / 2.0 - 1), 1.0)
a = 1 - np.exp(-1 / (0.06 * SR))
gain = signal.lfilter([a], [1, a - 1], gain)
mix *= gain

# Fades: in over the first 50 ms, out over the last 2.5 s.
t = np.arange(N) / SR
mix *= np.minimum(1, t / 0.05) * np.clip((DUR - t) / 2.5, 0, 1) ** 1.5

# Loudness: the drop sits at about -14 dBFS RMS; a soft knee catches the few peaks above -3 dBFS.
mix *= 10 ** ((-14.0 - level(mix, 64, 80)) / 20)
knee = 0.7
over = np.abs(mix) > knee
mix[over] = np.sign(mix[over]) * (knee + (1 - knee) * np.tanh((np.abs(mix[over]) - knee) / (1 - knee)))
mix *= min(1.0, 0.891 / (np.abs(mix).max() + 1e-12))
rms_db = level(mix, 64, 80)

# 16-bit PCM with triangular dither.
pcm = mix + (rng.uniform(-0.5, 0.5, mix.shape) + rng.uniform(-0.5, 0.5, mix.shape)) / 32768
pcm = np.clip(pcm * 32767, -32768, 32767).astype('<i2')
with wave.open(OUT, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.T.copy().tobytes())
print(f'wrote {OUT}: {DUR:.1f} s, {SR} Hz stereo, drop RMS {rms_db:.1f} dBFS, peak {20 * np.log10(np.abs(mix).max()):.1f} dBFS')
