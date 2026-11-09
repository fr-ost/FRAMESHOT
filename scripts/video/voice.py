#!/usr/bin/env python3
"""
FrameShot showcase narration: a male AI voice timed to the video and mixed
over the soundtrack, with the music ducked under the voice.

    python3 scripts/video/voice.py           → .output/video/voice.wav, mix.wav, captions.srt
    python3 scripts/video/voice.py --check   → also transcribes every line and the final mix with
                                               Whisper and reports the word error rate

The voice is Kokoro-82M v1.0 (Apache-2.0), voice "am_michael", run locally with
kokoro-onnx. The model files are fetched once into .output/video/tts/ with
`npm pack` (which runs no install scripts) from two npm packages that
redistribute them: kokoro-q8-shards (the int8 ONNX model, checked against its
SHA-256) and kokoro-local-runtime (the voice tensors).

Python packages: kokoro-onnx, soundfile, scipy; faster-whisper for --check
(with the Whisper model folder given by --whisper).
"""
import hashlib
import json
import subprocess
import sys
import tarfile
import wave
from pathlib import Path

import numpy as np
from scipy import signal

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / '.output/video'
TTS = OUT / 'tts'
SR = 48000
MODEL_SHA256 = 'fbae9257e1e05ffc727e951ef9b9c98418e6d79f1c9b6b13bd59f5c9028a1478'
args = sys.argv[1:]
CHECK = '--check' in args
WHISPER = args[args.index('--whisper') + 1] if '--whisper' in args else None


# ── Model files ──────────────────────────────────────────────────────────
def safe_extract(tgz, dest):
    with tarfile.open(tgz) as tf:
        for m in tf.getmembers():
            p = (dest / m.name).resolve()
            if not str(p).startswith(str(dest.resolve())) or not m.isfile():
                continue
            p.parent.mkdir(parents=True, exist_ok=True)
            with tf.extractfile(m) as src, open(p, 'wb') as dst:
                dst.write(src.read())


def ensure_model():
    model, voices = TTS / 'kokoro-q8.onnx', TTS / 'voices.npz'
    if model.exists() and voices.exists():
        return model, voices
    pk = TTS / 'pkgs'
    pk.mkdir(parents=True, exist_ok=True)
    subprocess.run(['npm', 'pack', 'kokoro-q8-shards@1.0.0', 'kokoro-local-runtime@0.1.0', '--silent'], cwd=pk, check=True)
    for t in pk.glob('*.tgz'):
        safe_extract(t, pk / t.stem)
    shards = sorted((pk / 'kokoro-q8-shards-1.0.0/package').glob('kokoro-q8.part*.bin'))
    data = b''.join(s.read_bytes() for s in shards)
    if hashlib.sha256(data).hexdigest() != MODEL_SHA256:
        raise SystemExit('Kokoro model checksum mismatch')
    model.write_bytes(data)
    vdir = pk / 'kokoro-local-runtime-0.1.0/package/voices'
    np.savez(voices, **{f.stem: np.fromfile(f, dtype='<f4').reshape(510, 1, 256) for f in vdir.glob('*.bin')})
    return model, voices


# ── Small DSP helpers ────────────────────────────────────────────────────
def peaking(f0, gain_db, q=0.9):
    A = 10 ** (gain_db / 40)
    w0 = 2 * np.pi * f0 / SR
    al = np.sin(w0) / (2 * q)
    b = [1 + al * A, -2 * np.cos(w0), 1 - al * A]
    a = [1 + al / A, -2 * np.cos(w0), 1 - al / A]
    return np.array(b) / a[0], np.array(a) / a[0]


def high_shelf(f0, gain_db):
    A = 10 ** (gain_db / 40)
    w0 = 2 * np.pi * f0 / SR
    c, sa = np.cos(w0), 2 * np.sqrt(A) * np.sin(w0) / 2 * np.sqrt(2)
    b = [A * ((A + 1) + (A - 1) * c + sa), -2 * A * ((A - 1) + (A + 1) * c), A * ((A + 1) + (A - 1) * c - sa)]
    a = [(A + 1) - (A - 1) * c + sa, 2 * ((A - 1) - (A + 1) * c), (A + 1) - (A - 1) * c - sa]
    return np.array(b) / a[0], np.array(a) / a[0]


def smooth(x, attack, release, rate):
    """Envelope follower with separate attack and release, at a control rate."""
    aa, rr = np.exp(-1 / (attack * rate)), np.exp(-1 / (release * rate))
    y = np.empty_like(x)
    v = 0.0
    for i, s in enumerate(x):
        v = aa * v + (1 - aa) * s if s > v else rr * v + (1 - rr) * s
        y[i] = v
    return y


def loudness(x):
    """Integrated loudness (ITU-R BS.1770-4) of a (channels, n) array at 48 kHz, in LUFS."""
    sos_shelf = signal.tf2sos(*high_shelf(1681.97, 4.0))
    sos_hp = signal.butter(2, 38.13, 'high', fs=SR, output='sos')
    y = signal.sosfilt(sos_hp, signal.sosfilt(sos_shelf, x, axis=-1), axis=-1)
    blk, hop = int(0.4 * SR), int(0.1 * SR)
    ms = np.array([np.sum(np.mean(y[:, i : i + blk] ** 2, axis=1)) for i in range(0, y.shape[1] - blk, hop)])
    lk = -0.691 + 10 * np.log10(ms + 1e-12)
    g = ms[lk > -70]
    rel = -0.691 + 10 * np.log10(np.mean(g)) - 10
    g2 = ms[(lk > -70) & (lk > rel)]
    return -0.691 + 10 * np.log10(np.mean(g2))


# ── Narration ────────────────────────────────────────────────────────────
VO = json.loads((ROOT / 'scripts/video/voiceover.json').read_text())
TL = json.loads((ROOT / 'scripts/video/timeline.json').read_text())
N = int(TL['duration'] * SR)
model_path, voices_path = ensure_model()
from kokoro_onnx import Kokoro  # noqa: E402

kokoro = Kokoro(str(model_path), str(voices_path))


def speak(text, speed):
    a, sr = kokoro.create(text, voice=VO['voice'], speed=speed, lang='en-us')
    a = signal.resample_poly(np.asarray(a, dtype=np.float64), SR // 24000 * 1, 1) if sr == 24000 else a
    env = np.convolve(np.abs(a), np.ones(240) / 240, mode='same')
    on = np.nonzero(env > 0.012)[0]
    if len(on):
        a = a[max(0, on[0] - int(0.025 * SR)) : min(len(a), on[-1] + int(0.08 * SR))]
    return a


MAX_SPEED = 1.15  # faster than this sounds rushed; shorten the line instead
voice = np.zeros(N)
captions = []
for i, line in enumerate(VO['lines']):
    slot = line['end'] - line['t']
    speed = line.get('speed', VO['speed'])
    a = speak(line['text'], speed)
    for _ in range(3):  # speed up gently if the line does not fit its slot
        if len(a) / SR <= slot or speed >= MAX_SPEED:
            break
        speed = min(MAX_SPEED, speed * (len(a) / SR) / slot * 1.02)
        a = speak(line['text'], speed)
    dur = len(a) / SR
    fits = dur <= slot + 0.02
    # Even level from line to line: scale to -20 dBFS RMS over the voiced part.
    act = a[np.abs(a) > 0.01]
    a *= 10 ** (-20 / 20) / (np.sqrt(np.mean(act ** 2)) + 1e-9)
    s = int(line['t'] * SR)
    voice[s : s + len(a)] += a[: N - s]
    captions.append((line['t'], line['t'] + dur, line['text']))
    print(f"{line['t']:6.2f}s  {dur:4.2f}/{slot:4.2f}s  speed {speed:.2f} {'' if fits else ' TOO LONG'}  {line['text']}")

# Voice chain: rumble filter, a touch of presence, gentle compression.
voice = signal.sosfilt(signal.butter(2, 85, 'high', fs=SR, output='sos'), voice)
voice = signal.lfilter(*peaking(3200, 2.5), voice)
voice = signal.lfilter(*high_shelf(9000, 1.5), voice)
rate = 1000
ctl = np.sqrt(np.mean(voice[: N // 48 * 48].reshape(-1, 48) ** 2, axis=1))  # 1 kHz RMS
thr = 10 ** (-26 / 20)
gr = np.ones_like(ctl)
gr[ctl > thr] = (ctl[ctl > thr] / thr) ** (1 / 3 - 1)
gr = 1 - smooth(1 - gr, 0.005, 0.12, rate)
voice[: len(gr) * 48] *= np.repeat(gr, 48)

# Ducking: keep the music 10 LU under the voice while it speaks and 3 LU under it in the gaps,
# measured moment by moment (K-weighted short-term loudness), so loud and quiet parts of the
# soundtrack sit the same way under the narration.
from scipy.ndimage import maximum_filter1d  # noqa: E402

with wave.open(str(OUT / 'music.wav')) as w:
    music = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').reshape(-1, 2).T.astype(np.float64) / 32768
music = music[:, :N]
voiced = ctl > 10 ** (-40 / 20)
speech = maximum_filter1d(voiced.astype(np.uint8), size=int(0.35 * rate)) > 0  # hold across short pauses
speech = np.concatenate([speech[100:], np.zeros(100, bool)])  # start ducking 100 ms early
speech_s = np.zeros(N, bool)
speech_s[: len(speech) * 48] = np.repeat(speech, 48)
v_st = np.stack([voice, voice])
# Bring the voice to about the soundtrack's loudness first, so the dips stay moderate.
v_st *= 10 ** ((loudness(music) + 1.0 - loudness(v_st[:, speech_s])) / 20)
L_voice = loudness(v_st[:, speech_s])
mk = signal.sosfilt(signal.butter(2, 38.13, 'high', fs=SR, output='sos'), signal.lfilter(*high_shelf(1681.97, 4.0), music, axis=-1), axis=-1)
cum = np.concatenate([[0.0], np.cumsum(np.sum(mk ** 2, axis=0))])
hop, blk = int(0.02 * SR), int(0.4 * SR)
centers = np.arange(0, N, hop)
a0, a1 = np.clip(centers - blk // 2, 0, N), np.clip(centers + blk // 2, 0, N)
L_music = -0.691 + 10 * np.log10((cum[a1] - cum[a0]) / np.maximum(1, a1 - a0) + 1e-12)
target = np.where(speech_s[centers], L_voice - 10.0, L_voice - 3.0)
att_db = smooth(np.clip(L_music - target, 0, 24), 0.08, 0.5, 1 / 0.02)
bed = music * np.interp(np.arange(N), centers, 10 ** (-att_db / 20))
mix = bed + v_st
print(f'voice over music: {L_voice - loudness(bed[:, speech_s]):+.1f} LU while speaking, '
      f'{L_voice - loudness(bed[:, ~speech_s]):+.1f} LU in the gaps')

def limit(x, ceiling):
    """Look-ahead peak limiter: gain drops just before a peak (5 ms) and recovers over 60 ms."""
    peak = np.abs(x).max(axis=0)
    n = len(peak) // 48 * 48
    pk = maximum_filter1d(peak[:n].reshape(-1, 48).max(axis=1), size=6, origin=-2)
    g = np.minimum(1.0, ceiling / np.maximum(pk, 1e-9))
    g = 1 - smooth(1 - g, 0.0005, 0.06, rate)
    y = x * np.interp(np.arange(x.shape[1]), np.arange(len(g)) * 48 + 24, g)
    return np.clip(y, -ceiling, ceiling)


# Master: loudness to -14 LUFS with peaks held at -2 dBFS (AAC encoding can add about 1 dB).
for _ in range(4):
    mix *= 10 ** ((-14.0 - loudness(mix)) / 20)
    mix = limit(mix, 10 ** (-2.0 / 20))
lufs = loudness(mix)


def write(path, x):
    x = np.atleast_2d(x)
    rng = np.random.default_rng(1)
    pcm = x + (rng.uniform(-0.5, 0.5, x.shape) + rng.uniform(-0.5, 0.5, x.shape)) / 32768
    pcm = np.clip(pcm * 32767, -32768, 32767).astype('<i2')
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(x.shape[0])
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.T.copy().tobytes())


write(OUT / 'voice.wav', voice / (np.abs(voice).max() + 1e-9) * 0.9)
write(OUT / 'mix.wav', mix)


def ts(t):
    ms = int(round(t * 1000))
    return f'{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}'


def wrap(text, width=42):
    """At most two lines of about 42 characters, split at the space nearest the middle."""
    if len(text) <= width:
        return text
    spaces = [i for i, c in enumerate(text) if c == ' ']
    cut = min(spaces, key=lambda i: abs(i - len(text) / 2))
    return f'{text[:cut]}\n{text[cut + 1:]}'


# Captions: each line stays up a little after it is spoken, but never overlaps the next one.
srt, merged = [], []
for t0, t1, text in captions:
    if merged and t0 - merged[-1][1] < 0.15 and len(merged[-1][2]) + len(text) < 40:
        merged[-1] = (merged[-1][0], t1, f'{merged[-1][2]} {text}')
    else:
        merged.append((t0, t1, text))
for i, (t0, t1, text) in enumerate(merged, 1):
    end = t1 + 0.4 if i == len(merged) else min(t1 + 0.4, merged[i][0] - 0.05)
    srt.append(f'{i}\n{ts(t0)} --> {ts(end)}\n{wrap(text)}\n')
(OUT / 'captions.srt').write_text('\n'.join(srt))
print(f'wrote mix.wav ({lufs:.1f} LUFS, peak {20 * np.log10(np.abs(mix).max()):.1f} dBFS), voice.wav, captions.srt ({len(merged)} captions)')

if CHECK:
    sys.path.insert(0, str(Path(__file__).parent))
    from faster_whisper import WhisperModel

    wm = WhisperModel(WHISPER, device='cpu', compute_type='int8')

    def norm(s):
        s = s.lower().replace('-', ' ').replace('’', "'").replace('frame shot', 'frameshot')
        words = __import__('re').sub(r"[^a-z0-9' ]", ' ', s).split()
        return [{'1': 'one', '2': 'two', '3': 'three', '4': 'four'}.get(w, w) for w in words]

    def wer(r, h):
        r, h = norm(r), norm(h)
        d = list(range(len(h) + 1))
        for i in range(1, len(r) + 1):
            prev, d[0] = d[0], i
            for j in range(1, len(h) + 1):
                cur = min(d[j] + 1, d[j - 1] + 1, prev + (r[i - 1] != h[j - 1]))
                prev, d[j] = d[j], cur
        return d[len(h)] / max(1, len(r))

    to16 = lambda x: signal.resample_poly(x, 1, 3).astype(np.float32)
    bad = 0
    for t0, t1, text in captions:
        seg = voice[int(t0 * SR) : int((t1 + 0.1) * SR)]
        hyp = ' '.join(s.text for s in wm.transcribe(to16(seg), language='en', beam_size=5)[0]).strip()
        e = wer(text, hyp)
        bad += e > 0.15
        if e > 0:
            print(f'  line {t0:6.2f}s  WER {e:.2f}  heard: {hyp}')
    full = ' '.join(s.text for s in wm.transcribe(to16(mix.mean(axis=0)), language='en', beam_size=5)[0])
    print(f'lines with WER > 0.15: {bad}/{len(captions)};  whole mix WER {wer(" ".join(c[2] for c in captions), full):.3f}')
