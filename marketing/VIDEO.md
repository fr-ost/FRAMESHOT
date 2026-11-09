# FrameShot showcase video

A 2-minute product video (1920 × 1080, 30 fps, H.264 with AAC stereo sound) that walks through FrameShot's features using the real extension UI, with an original soundtrack.

The finished file is `marketing/frameshot-showcase.mp4` (32 MB, about 2.1 Mbit/s): sharp enough for sharing anywhere. Rendering writes a higher-bitrate master (about 85 MB, CRF 16) to `.output/video/frameshot-showcase.mp4`; use that one for uploads that re-encode, such as YouTube.

Checks run on the master: exactly 120.000 s, 3,600 frames of H.264 High 1920 × 1080 at 30 fps, AAC LC stereo at 48 kHz, a full decode with no errors, and an integrated loudness of −12.8 LUFS.

## What's in it

| Time | Scene | What you see |
|---|---|---|
| 0:00 | Intro | Logo, name, "Screen recorder & full-page screenshots for Chrome", Free forever · No watermark · No sign-up · Nothing uploaded, then "Capture. Record. Annotate. Share." on the beat |
| 0:08 | Full-page screenshots | The toolbar button opens the popup, Full page is clicked, the page scrolls with a progress bar, then the result: one image of the whole page |
| 0:24 | Capture modes | Visible area (with a delay), Selected area and Element, each with its shortcut, shown with the real selection tools |
| 0:32 | Annotate | The editor draws a highlight, a box, a note, an arrow and numbered steps, with the camera following each one |
| 0:48 | Privacy tools | A blur over an email, FrameShot's own warning that blur can be reversed, and a solid redaction over a card number |
| 0:56 | Into the recorder | "Now, record your screen." and a 3-2-1 countdown on the beat |
| 1:04 | Screen recorder | A recording in progress with a live timer, the camera bubble and the sound meter, then the player |
| 1:20 | GIF export | Trimming part of the recording and creating a GIF |
| 1:28 | Composer | Three looks: gradients, frames and padding |
| 1:36 | Library | Dark to light theme switch, search, collections, duplicates and the shortcuts sheet |
| 1:44 | Private by design | No uploads, no account, no watermark, no ads or tracking, works offline, free forever |
| 1:52 | Outro | Logo, "Add to Chrome — it's free", and the credit to Unique Labs and Shahriar Ahmed |

Everything shown is a real FrameShot screen captured from the extension. The page being captured is the fictional demo in `store-assets/demo/` (served as `app.example.com`, a reserved documentation domain). There are no ratings, user numbers or testimonials.

## The soundtrack

The music and sound effects are synthesized from scratch by `scripts/video/music.py`: no samples, no loops from libraries, no licensed tracks. You can use the video anywhere, including on YouTube, in the Chrome Web Store listing and in ads, without a music claim.

It is a 120 BPM track in C major / A minor: pads, a plucked arpeggio, bass, drums, a lead hook in the choruses, and risers and impacts that land on the scene changes. Quiet UI sounds (clicks, key presses, the shutter, the countdown ticks, a chime) follow the timeline. The mix was balanced by measurement: the drop sits at about −15 dBFS RMS with peaks at −1 dBFS.

## Making it again

```bash
npm run video
```

That runs the three steps:

| Step | Command | Output |
|---|---|---|
| Capture the real UI | `npm run video:capture` | `.output/video/raw/*.png` (2× captures) |
| Synthesize the soundtrack | `npm run video:music` | `.output/video/music.wav` |
| Render and encode | `npm run video:render` | `.output/video/frameshot-showcase.mp4` |

To check a few moments without rendering everything:

```bash
node scripts/video/render.mjs --preview 12,35,65.5,100
```

The stills go to `.output/video/preview/`.

## How it works

- `scripts/video/timeline.json` holds the scene times and the moments for sound effects. The music and the animation both read it, so clicks and whooshes land on the visuals.
- `scripts/video/stage.html` is a 1920 × 1080 page with all twelve scenes. Every frame is a pure function of time (`window.seek(t)`), using keyframes for position, scale, blur, opacity, clipping and a zoom camera inside each app window. Drawing effects reveal the next real editor state inside the area being drawn, in step with the cursor.
- `scripts/video/render.mjs` opens the stage in four headless Chromium tabs, captures each frame through the DevTools protocol, encodes four segments with x264 (CRF 16, `aq-mode=3` to keep dark gradients smooth), joins them and adds the soundtrack as AAC.

To change a scene, edit its block in `stage.html` (the blocks are numbered like the table above). To move a scene, change its time in `timeline.json`, adjust the matching sound-effect times, and run the music and render steps again.
