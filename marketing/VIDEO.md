# FrameShot showcase video

A 2-minute product video (1920 × 1080, 30 fps, H.264 with AAC stereo sound) that walks through FrameShot's features using the real extension UI, with a male AI narration over an original soundtrack.

| File | What it is |
|---|---|
| `marketing/frameshot-showcase.mp4` | The video with narration (about 2.1 Mbit/s): sharp enough for sharing anywhere |
| `marketing/frameshot-showcase.srt` | Captions of the narration, for YouTube, LinkedIn, X and other players |
| `.output/video/frameshot-showcase.mp4` | The higher-bitrate master written by rendering (CRF 16). Use it for uploads that re-encode, such as YouTube |

## What's in it

| Time | Scene | What you see |
|---|---|---|
| 0:00 | Intro | Logo, name, "Screen recorder & full-page screenshots for Chrome", Free forever · No watermark · No sign-up · Nothing uploaded, then "Capture. Record. Annotate. Share." on the beat |
| 0:08 | Full-page screenshots | The toolbar button opens the popup, Full page is clicked, the page scrolls with a progress bar, then the result: one image of the whole page |
| 0:24 | Capture modes | Visible area (with a delay), Selected area and Element, each with its shortcut, shown with the real selection tools |
| 0:32 | Annotate | The editor draws a highlight, a box, a note, an arrow and numbered steps, with the camera following each one |
| 0:48 | Privacy tools | A blur over an email, FrameShot's own warning that blur can be reversed, and a solid redaction over a card number |
| 0:56 | Into the recorder | "Now, record your screen." and a 3-2-1 countdown on the beat |
| 1:04 | Screen recorder | A recording in progress with a live timer, the sound panel, the camera bubble, then the player |
| 1:20 | GIF export | Trimming part of the recording and creating a GIF |
| 1:28 | Composer | Three looks: gradients, frames and padding |
| 1:36 | Library | Dark to light theme switch, search, collections, duplicates and the shortcuts sheet |
| 1:44 | Private by design | No uploads, no account, no watermark, no ads or tracking, works offline, free forever |
| 1:52 | Outro | Logo, "Add to Chrome — it's free", and the credit to Unique Labs and Shahriar Ahmed |

Everything shown is a real FrameShot screen captured from the extension. The page being captured is the fictional demo in `store-assets/demo/` (served as `app.example.com`, a reserved documentation domain). There are no ratings, user numbers or testimonials.

## The narration

The script is in `scripts/video/voiceover.json`: 34 short lines, each with the moment it starts and the moment it must end, so the words land with the pictures ("Click Full page" as the cursor clicks it, "box the number that counts" as the box is drawn, "Three. Two. One." on the countdown).

The voice is **Kokoro-82M** (v1.0, Apache-2.0 licence, commercial use allowed), using its American male voice `am_michael`, generated locally with `kokoro-onnx`. It is a synthetic voice, not a recording or clone of a real person. Lines are spoken at 1.0–1.1× speed; anything that would need to be faster is shortened instead, so nothing sounds rushed.

How it is mixed (`scripts/video/voice.py`):
- Each line is trimmed and brought to the same level, then a rumble filter, a little presence and gentle compression are applied.
- The music ducks automatically: it is kept about 10 LU under the voice while it speaks and rises again between lines, measured moment by moment, so the loud and quiet parts of the soundtrack sit the same way under the voice.
- The whole mix is set to −14 LUFS (the level YouTube and most platforms play at) with peaks at −1.5 dBFS or lower.

Checks: every line was transcribed back with Whisper (small, MIT licence), and so was the full mix with the music. None of the 34 lines came back with more than 15% of its words different (the remaining differences are "any time" for "anytime" and "gift" for "GIF"), and the transcript of the whole mix matched the script word for word.

## The soundtrack

The music and sound effects are synthesized from scratch by `scripts/video/music.py`: no samples, no loops from libraries, no licensed tracks. You can use the video anywhere, including on YouTube, in the Chrome Web Store listing and in ads, without a music claim.

It is a 120 BPM track in C major / A minor: pads, a plucked arpeggio, bass, drums, a lead hook in the choruses, and risers and impacts that land on the scene changes. Quiet UI sounds (clicks, key presses, the shutter, the countdown ticks, a chime) follow the timeline. The music-only version is balanced by measurement: the drop sits at about −15 dBFS RMS with peaks at −1 dBFS.

## Making it again

```bash
npm run video
```

That runs four steps:

| Step | Command | Output |
|---|---|---|
| Capture the real UI | `npm run video:capture` | `.output/video/raw/*.png` (2× captures) |
| Synthesize the soundtrack | `npm run video:music` | `.output/video/music.wav` |
| Narrate and mix | `npm run video:voice` | `.output/video/mix.wav`, `voice.wav`, `captions.srt` |
| Render and encode | `npm run video:render` | `.output/video/frameshot-showcase.mp4` (uses `mix.wav`, or `music.wav` if there is no narration) |

The narration step needs Python packages `kokoro-onnx`, `soundfile` and `scipy`. The first run fetches the model into `.output/video/tts/` with `npm pack` (which runs no install scripts) from two npm packages that redistribute it: `kokoro-q8-shards` (the int8 ONNX model, checked against its SHA-256) and `kokoro-local-runtime` (the voice files). To check the narration with speech recognition as well, install `faster-whisper` and run `python3 scripts/video/voice.py --check --whisper <folder of a Whisper model in CTranslate2 format>`.

To change what is said, edit the line in `voiceover.json` (keep its start and end times inside its scene) and run the narration and render steps again. To try another voice, change `"voice"`: other male voices include `am_fenrir`, `am_puck`, `am_eric` and the British `bm_george` and `bm_fable`.

To check a few moments of the picture without rendering everything:

```bash
node scripts/video/render.mjs --preview 12,35,65.5,100
```

The stills go to `.output/video/preview/`.

## How it works

- `scripts/video/timeline.json` holds the scene times and the moments for sound effects. The music and the animation both read it, so clicks and whooshes land on the visuals.
- `scripts/video/stage.html` is a 1920 × 1080 page with all twelve scenes. Every frame is a pure function of time (`window.seek(t)`), using keyframes for position, scale, blur, opacity, clipping and a zoom camera inside each app window. Drawing effects reveal the next real editor state inside the area being drawn, in step with the cursor.
- `scripts/video/render.mjs` opens the stage in four headless Chromium tabs, captures each frame through the DevTools protocol, encodes four segments with x264 (CRF 16, `aq-mode=3` to keep dark gradients smooth), joins them and adds the sound as AAC.

To change a scene, edit its block in `stage.html` (the blocks are numbered like the table above). To move a scene, change its time in `timeline.json`, adjust the matching sound-effect and narration times, and run the music, narration and render steps again.
