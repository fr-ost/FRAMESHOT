/** The home page: what FrameShot does, why to choose it, and answers to common questions. */
import { SITE, SITE_URL } from '../config.mjs';
import { POSTS } from '../meta.mjs';
import { asset, breadcrumbLd, chip, icon, installButton, picture, softwareLd, windowFrame } from '../layout.mjs';
import { postCard } from './shared.mjs';

const tick = (t) => `<li>${icon('CircleCheck', 19)}<span>${t}</span></li>`;
const ticks = (items) => `<ul class="ticks">${items.map(tick).join('')}</ul>`;
const k = (keys) => keys.split('+').map((x) => `<kbd>${x}</kbd>`).join('+');

const USES = [
  ['Bug', 'Bug reports'],
  ['Presentation', 'Product demos'],
  ['GraduationCap', 'Tutorials and lessons'],
  ['Palette', 'Design reviews'],
  ['Code', 'Code reviews'],
  ['Headset', 'Customer support'],
  ['BookOpen', 'Documentation'],
  ['MessageSquareText', 'Website feedback'],
  ['Receipt', 'Receipts and orders'],
  ['NotebookPen', 'Research notes'],
  ['Sparkles', 'Portfolio shots'],
  ['Megaphone', 'Social posts'],
];

const FEATURES = [
  ['Video', 'g2', 'Screen recorder with sound', 'Record a tab, a window or your whole screen. Add your microphone, the tab’s or the computer’s sound, and a webcam bubble you can move while you record.'],
  ['ScrollText', 'g1', 'Full-page screenshots', 'One click scrolls the page, stitches every part together and puts the page back exactly as it was. Sticky headers appear once and lazy images load first.'],
  ['SquareDashedMousePointer', 'g5', 'Area, element or what’s on screen', 'Drag a box and scroll to make it taller, click a single element, or grab the visible part of the page, with an optional 3, 5 or 10 second delay.'],
  ['PenTool', 'g6', 'Annotate in seconds', 'Arrows, shapes, text, a highlighter, numbered steps and symbols. Every mark stays editable, with up to 100 steps of undo.'],
  ['EyeOff', 'g4', 'Blur, pixelate or redact', 'Hide emails, faces and card numbers before you share. A solid redaction box is flattened into the exported pixels, so it can’t be peeled back.'],
  ['Film', 'g2', 'Turn clips into GIFs', 'Pick the moment, choose a width and a frame rate, and get a small looping GIF, made entirely on your computer.'],
  ['Frame', 'g5', 'Backgrounds and browser frames', 'Place a capture on a gradient with padding, rounded corners, a soft shadow and a browser frame, sized for social posts or slides.'],
  ['LibraryBig', 'g1', 'A library that stays organised', 'Search by page title, site or tag, sort captures into collections, mark favourites and find duplicates. Videos and screenshots live side by side.'],
  ['Download', 'g5', 'Export the way you need', 'Download an image or a multi-page PDF, copy to the clipboard, or export a whole selection as a ZIP. Recordings are saved as MP4 or WebM.'],
];

const TOUR = [
  {
    id: 'record',
    tab: ['Video', 'Record'],
    img: 'recorder',
    title: 'FrameShot Studio — Recorder',
    alt: 'The FrameShot recorder with sound sources, a camera bubble preview and the record button',
    h: 'A screen recorder that simply works',
    p: 'Choose what to share in Chrome’s own picker, check your sound on the live meter and start after a short countdown. Pause whenever you need to: the pauses are left out of the video.',
    items: ['A tab, a window or your entire screen', 'Microphone, tab sound and system sound in one track', 'Webcam bubble in any corner, resizable while you record', 'From 720p up to 4K, at 15, 30 or 60 frames per second'],
  },
  {
    id: 'annotate',
    tab: ['PenTool', 'Annotate'],
    img: 'editor',
    title: 'FrameShot Studio — Editor',
    alt: 'A full-page capture in the FrameShot editor with arrows, numbered steps and a text note',
    h: 'Explain it with arrows, not paragraphs',
    p: 'Open any capture in the editor and point at what matters. Shapes snap into place, text stays sharp, and you can change every mark later because the original is never overwritten.',
    items: ['Arrows, lines, boxes, ellipses and a smooth pen', 'Text with an outline or background that reads on any image', 'Numbered step markers that count themselves', 'Crop with aspect presets, rotate, flip and resize'],
  },
  {
    id: 'protect',
    tab: ['EyeOff', 'Protect'],
    img: 'redact',
    title: 'FrameShot Studio — Editor',
    alt: 'A billing form in the FrameShot editor with the email blurred and the card number covered by a solid box',
    h: 'Share the screenshot, not the secrets',
    p: 'Cover anything private before it leaves your computer. FrameShot even reminds you that blur and pixelation can sometimes be reversed for short text, and that a solid box can’t.',
    items: ['Blur with adjustable strength', 'Pixelate with adjustable block size', 'Solid redaction for passwords and card numbers', 'Flattened into every image, PDF and clipboard copy'],
  },
  {
    id: 'gif',
    tab: ['Film', 'GIF'],
    img: 'gif',
    title: 'FrameShot Studio — Player',
    alt: 'The Export as GIF dialog over a recording, with the trimmed range, width and frame rate options',
    h: 'From recording to GIF in a few clicks',
    p: 'GIFs play everywhere: in chats, tickets, docs and READMEs. Choose the part of a recording you need and FrameShot builds a light GIF that reuses unchanged pixels between frames.',
    items: ['Trim to the exact moment, up to 60 seconds', 'From 320 to 800 pixels wide, at 10, 15 or 20 fps', 'Loop forever or play once', 'Made on your device, nothing uploaded'],
  },
  {
    id: 'present',
    tab: ['Frame', 'Present'],
    img: 'composer',
    title: 'FrameShot Studio — Composer',
    alt: 'A screenshot on a violet gradient background with a browser frame and soft shadow in the FrameShot composer',
    h: 'Make it look good enough to post',
    p: 'Turn a plain capture into something you’d happily put in a slide, a tweet or a launch post, without opening a design app.',
    items: ['Gradient, solid or transparent backgrounds', 'Padding, rounded corners and soft shadows', 'Light or dark browser frame showing the page’s domain', 'Sizes for social posts, slides and stories'],
  },
  {
    id: 'organize',
    tab: ['FolderOpen', 'Organize'],
    img: 'library-light',
    dark: 'library-dark',
    title: 'FrameShot Studio — Library',
    alt: 'The FrameShot library with screenshots and recordings in a grid, collections in the sidebar and a search box',
    h: 'Find any capture in a second',
    p: 'Every screenshot and recording lands in one library on your computer, with the page title, the site and the date already filled in.',
    items: ['Search titles, sites, addresses and tags', 'Collections, favourites and tags', 'Duplicate finder and side-by-side comparison', 'Grid or list view, with recordings in their own view'],
  },
];

export const FAQ = [
  ['Is FrameShot really free?', '<p>Yes. Every feature is free for everyone: full-page screenshots, screen recording up to 4K, the editor, GIF export and PDF. There is no paid plan, no trial, no watermark and no sign-up. If you want to help, you can rate it or <a href="/support">support the project</a>, but that unlocks nothing extra.</p>'],
  ['Does FrameShot upload my screenshots or recordings?', '<p>No. Your files stay in your browser until you download or copy them, and FrameShot’s pages are blocked from connecting to any server except its own install counter. The only thing FrameShot sends is an anonymous install count: a random ID, the version, your operating system and language when it is installed, updated or removed. You can turn that off in Settings. It works offline too.</p>'],
  ['How do I take a full-page screenshot in Chrome?', `<p>Click the FrameShot icon and choose <b>Full page</b>, or press ${k('Alt+Shift+F')} (Option+Shift+F on a Mac). FrameShot scrolls the page, captures each part, stitches them into one image and restores your scroll position. The result opens in the editor. Our <a href="/blog/how-to-take-a-full-page-screenshot-in-chrome">full-page screenshot guide</a> covers tricky pages too.</p>`],
  ['Can I record my screen with sound?', '<p>Yes. Sharing a Chrome tab records that tab’s sound on every system. Sharing your entire screen records the computer’s sound on Windows and ChromeOS, and on macOS 14.2 or later with Chrome 141 or later. You can add your microphone to any recording, and FrameShot mixes everything into one track.</p>'],
  ['Why is my screen recording silent?', '<p>Sound is shared by Chrome, not by the extension, so it depends on what you pick in Chrome’s dialog. Keep <b>Also share tab audio</b> on for a tab, or tick <b>Also share system audio</b> for your entire screen. A single window never includes sound in Chrome. FrameShot shows a live sound meter and warns you as soon as a recording has no sound. See <a href="/blog/how-to-record-your-screen-with-audio-in-chrome">how to record your screen with audio</a>.</p>'],
  ['Can I show my webcam while recording?', '<p>Yes. Turn on the camera and your face appears in a round bubble in the corner of the video. You can choose the corner and the size, and change them while recording.</p>'],
  ['Is there a time limit on recordings?', '<p>FrameShot sets no time limit. Recordings are saved in small pieces while you record, so their length is limited only by the storage space Chrome can use on your computer. If Chrome closes unexpectedly, FrameShot offers to recover the recording. GIF exports cover up to 60 seconds of a recording.</p>'],
  ['Which file formats can I save?', '<p>Screenshots download as PNG, JPEG or WebP images, or as a PDF in A4, Letter or the image’s own size. You can also copy them to the clipboard, combine several into one PDF, or export a selection as a ZIP. Recordings are saved as MP4 or WebM, and any part of one can become a GIF.</p>'],
  ['How do I hide passwords or personal details in a screenshot?', '<p>Open the capture in the editor and use <b>Redact (solid)</b> for passwords, card numbers and anything that must stay secret. <b>Blur</b> and <b>Pixelate</b> are fine for faces or background details, but they can sometimes be reversed for short text. All three are flattened into the exported file. Read more in our <a href="/blog/how-to-blur-or-redact-sensitive-information-in-screenshots">redaction guide</a>.</p>'],
  ['Can I capture only part of a page?', '<p>Yes. <b>Selected area</b> lets you drag a box, adjust it with handles or arrow keys, and scroll to extend it past the screen. <b>Element</b> highlights parts of the page as you hover, and ↑/↓ moves to the parent or child element. There’s also <b>Visible area</b>, with an optional 3, 5 or 10 second delay to open a menu first.</p>'],
  ['What are the keyboard shortcuts?', `<p>By default: ${k('Alt+Shift+V')} visible area, ${k('Alt+Shift+F')} full page, ${k('Alt+Shift+A')} selected area and ${k('Alt+Shift+E')} element. You can add shortcuts for recording, the library and more, or change any of them, at <code>chrome://extensions/shortcuts</code>.</p>`],
  ['What permissions does FrameShot need, and why?', '<p>Only a few. <b>activeTab</b> and <b>scripting</b> let it capture the page you’re on, and only after you start a capture. <b>storage</b> and <b>unlimitedStorage</b> keep your library on your computer, <b>downloads</b> saves your files, <b>contextMenus</b> adds the right-click menu and <b>offscreen</b> plays the shutter and countdown sounds. FrameShot has no permanent access to any website.</p>'],
  ['Why can’t I capture some pages?', '<p>Chrome doesn’t let any extension capture its own pages, such as <code>chrome://</code> settings, the Chrome Web Store or other extensions. FrameShot tells you when that’s the case. You can still record them by sharing a window or your entire screen in the screen recorder.</p>'],
  ['Does FrameShot work offline?', '<p>Yes. Capturing, recording, editing and exporting all happen inside Chrome on your computer, so FrameShot works the same without an internet connection.</p>'],
  ['Which browsers and systems are supported?', '<p>FrameShot is made for Google Chrome, version 116 or later, on Windows, macOS, Linux and ChromeOS. Other browsers based on Chromium that install extensions from the Chrome Web Store may work, but they aren’t officially tested.</p>'],
  ['Where are my files stored, and how do I delete them?', '<p>In your browser’s own storage for FrameShot, on your computer. Delete single items in the library, or use <b>Settings → Storage → Clear all local data</b> to remove everything. Uninstalling FrameShot also removes all of its data. Files you already downloaded stay yours.</p>'],
  ['Does FrameShot add a watermark?', '<p>Never. Your screenshots, PDFs, videos and GIFs contain only what you captured.</p>'],
  ['How can I support FrameShot?', '<p>The best help is free: rate FrameShot on the Chrome Web Store and tell a friend or colleague about it. Bug reports and ideas are welcome on <a href="https://t.me/igfrostt" rel="noopener" target="_blank">Telegram</a>. If you’d like to donate, the <a href="/support">support page</a> has the details.</p>'],
];

const strip = (html) => html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

export function homePage() {
  const tourTabs = TOUR.map(
    (t, i) =>
      `<button class="tab" type="button" role="tab" id="tab-${t.id}" aria-controls="panel-${t.id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${icon(t.tab[0], 17)}${t.tab[1]}<span class="bar" aria-hidden="true"></span></button>`,
  ).join('');
  const tourPanels = TOUR.map(
    (t, i) =>
      `<div class="panel${i === 0 ? ' show' : ''}" id="panel-${t.id}" role="tabpanel" aria-labelledby="tab-${t.id}"${i === 0 ? '' : ' hidden'}>
<div>${windowFrame(t.img, { title: t.title, alt: t.alt, sizes: '(max-width: 900px) 92vw, 640px', dark: t.dark })}</div>
<div><h3>${t.h}</h3><p>${t.p}</p>${ticks(t.items)}</div>
</div>`,
  ).join('\n');

  const uses = USES.map(([ic, label]) => `<li>${icon(ic, 17)}${label}</li>`).join('');
  const faq = FAQ.map(
    ([q, a]) => `<details class="reveal"><summary>${q}<span class="pm" aria-hidden="true">${icon('Plus', 17, 2.4)}</span></summary><div class="ans">${a}</div></details>`,
  ).join('\n');

  const body = `
<section class="hero">
<div class="wrap hero-grid">
<div class="hero-copy">
<span class="kicker"><b>FREE</b><span class="kk"><span>Chrome extension</span> · <span>No watermark</span> · <span>No sign-up</span></span></span>
<h1>Record your screen. Capture the whole page. <span class="grad">Free forever.</span></h1>
<p class="lead">FrameShot is a screen recorder and full-page screenshot tool for Chrome. Record with sound and your webcam, capture any page in one click, then annotate, blur and share it. Nothing is ever uploaded.</p>
<div class="cta-row">${installButton({ size: 'btn-lg' })}<a class="btn btn-lg" href="#tour">${icon('PlayCircle', 20)}See it in action</a></div>
<ul class="trust"><li>${icon('Check', 17, 2.6)}No watermark</li><li>${icon('Check', 17, 2.6)}No account</li><li>${icon('Check', 17, 2.6)}Nothing uploaded</li><li>${icon('Check', 17, 2.6)}Works offline</li></ul>
</div>
<div class="hero-art">
${windowFrame('editor', { title: 'FrameShot Studio — Editor', alt: 'The FrameShot editor showing a full-page screenshot with arrows, numbered steps and a note', sizes: '(max-width: 980px) 92vw, 600px', eager: true, priority: true })}
<div class="popup">${picture('popup', { alt: 'The FrameShot popup with visible area, full page, selected area and element capture, plus a Record screen button', sizes: '240px', eager: true })}</div>
${chip('Video', 'Up to 4K', 'Screen recording with sound', 'g2', 'chip-1')}
${chip('ShieldCheck', 'Nothing uploaded', 'Stays on your device', 'g3', 'chip-2')}
</div>
</div>
</section>

<section class="uses" aria-label="What people use FrameShot for">
<p class="uses-label">Made for</p>
<div class="marquee"><ul>${uses}</ul><ul aria-hidden="true">${uses}</ul></div>
</section>

<section class="section" id="features">
<div class="wrap">
<div class="sec-head reveal"><span class="eyebrow">${icon('Sparkles', 16)}Features</span><h2>Everything you need to <span class="grad">show what you see</span></h2><p>A screen recorder, a screenshot tool and an image editor in one light extension, sharing one private library.</p></div>
<div class="feat-grid">
${FEATURES.map(([ic, g, h, p], i) => `<article class="card feat spot lift reveal" style="--i:${i % 3}"><span class="fi ${g}">${icon(ic, 23)}</span><h3>${h}</h3><p>${p}</p></article>`).join('\n')}
</div>
</div>
</section>

<section class="section section-alt" id="tour">
<div class="wrap">
<div class="sec-head reveal"><span class="eyebrow">${icon('MousePointerClick', 16)}Take the tour</span><h2>From capture to share in <span class="grad">under a minute</span></h2><p>Every part of FrameShot is a click away from the toolbar. Here’s what you’ll find inside.</p></div>
<div data-tabs class="reveal">
<div class="tabs" role="tablist" aria-label="FrameShot tour">${tourTabs}</div>
<div class="panels">${tourPanels}</div>
</div>
</div>
</section>

<section class="section" id="full-page">
<div class="wrap split">
<div class="reveal">
<span class="eyebrow">${icon('ScrollText', 16)}Full-page screenshots</span>
<h2 class="h2">The whole page, top to bottom, <span class="grad">in one image</span></h2>
<p class="sub">Screenshot keys stop at the edge of your screen. FrameShot scrolls the page for you, captures each part at your screen’s full sharpness and stitches them into one seamless image.</p>
${ticks(['Sticky and fixed headers shown once, not on every slice', 'Lazy images and endless feeds loaded before the capture', 'Pages that scroll inside a panel captured correctly', 'Very long pages split into full-resolution parts, or scaled into one', 'Your scroll position and the page restored afterwards'])}
<div class="keys"><span>${k('Alt+Shift+F')} Full page</span><span>${k('Alt+Shift+V')} Visible area</span><span>${k('Alt+Shift+A')} Selected area</span><span>${k('Alt+Shift+E')} Element</span></div>
</div>
<div class="split-art reveal" style="--i:1">
<div class="scan">
<div class="scan-badge"><i></i>Capturing full page…</div>
<div class="scan-page">${picture('fullpage', { alt: 'A long web page captured from top to bottom as one image', sizes: '380px' })}</div>
<div class="scan-line" aria-hidden="true"></div>
</div>
</div>
</div>
</section>

<section class="section section-alt" id="recorder">
<div class="wrap split rev">
<div class="reveal">
<span class="eyebrow">${icon('Video', 16)}Screen recorder</span>
<h2 class="h2">Record your screen <span class="grad">with sound and camera</span></h2>
<p class="sub">Make a walkthrough, a bug report or a lesson without installing an app. FrameShot records right in Chrome and keeps the video on your computer.</p>
<div class="sound-grid">
<div class="card sound"><b>${icon('PanelTop', 18)}A Chrome tab</b><p>Records the tab’s own sound on every system. Keep “Also share tab audio” on.</p></div>
<div class="card sound"><b>${icon('Monitor', 18)}Entire screen</b><p>Records computer sound on Windows and ChromeOS, and on macOS 14.2+ with Chrome 141+.</p></div>
<div class="card sound"><b>${icon('AppWindow', 18)}One window</b><p>Chrome never shares a window’s sound, so FrameShot tells you before you start.</p></div>
</div>
${ticks(['Countdown of 3, 5 or 10 seconds, or none', 'Pause and resume, with the pauses left out', 'Saved in pieces as you go, so a crash doesn’t lose your take', 'Download as MP4 or WebM, or save a frame as a screenshot'])}
</div>
<div class="split-art rec-art reveal" style="--i:1">
${windowFrame('recorder', { title: 'FrameShot Studio — Recorder', alt: 'The FrameShot recorder with a tab selected, microphone and tab sound switched on, and a camera bubble', sizes: '(max-width: 900px) 92vw, 560px' })}
<div class="chip rec-chip"><span class="rec-dot" aria-hidden="true"></span><span><b data-timer>0:00</b><small>Recording · tab sound + mic</small></span><span class="eq" aria-hidden="true">${'<span></span>'.repeat(7)}</span></div>
</div>
</div>
</section>

<section class="section" id="protect">
<div class="wrap split">
<div class="reveal">
<span class="eyebrow">${icon('EyeOff', 16)}Privacy tools</span>
<h2 class="h2">Blur it, pixelate it, <span class="grad">or black it out</span></h2>
<p class="sub">Blur and pixelation work well for faces and background details. For passwords, card numbers and anything that must stay secret, use a solid redaction box. It is flattened into the exported pixels, so the hidden text simply isn’t in the file.</p>
${ticks(['Drag the slider to compare the original and the shared version', 'The original stays in your library so you can keep editing', 'Apply edits permanently when the original should go too'])}
<p class="more"><a href="/blog/how-to-blur-or-redact-sensitive-information-in-screenshots">When to blur and when to redact ${icon('ArrowRight', 16)}</a></p>
</div>
<div class="split-art reveal" style="--i:1">
<div class="ba" data-ba>
<div class="ba-layer ba-form">
<p class="ba-title">Billing details</p>
<div class="ba-row"><div class="ba-field"><label>Name</label><div>Alex Morgan</div></div><div class="ba-field"><label>Email</label><div>alex.morgan@example.com</div></div></div>
<div class="ba-row"><div class="ba-field"><label>Card number</label><div>4242 4242 4242 4242</div></div><div class="ba-field"><label>Expiry · CVC</label><div>08/29 · 314</div></div></div>
<div class="ba-row"><div class="ba-field"><label>Address</label><div>21 Example Street</div></div><div class="ba-field"><label>Phone</label><div>+1 555 0134</div></div></div>
</div>
<div class="ba-after" aria-hidden="true"><div class="ba-layer ba-form">
<p class="ba-title">Billing details</p>
<div class="ba-row"><div class="ba-field"><label>Name</label><div>Alex Morgan</div></div><div class="ba-field"><label>Email</label><div><span class="ba-blur">alex.morgan@example.com</span></div></div></div>
<div class="ba-row"><div class="ba-field"><label>Card number</label><div class="ba-redact">4242 4242 4242 4242</div></div><div class="ba-field"><label>Expiry · CVC</label><div class="ba-redact">08/29 · 314</div></div></div>
<div class="ba-row"><div class="ba-field"><label>Address</label><div><span class="ba-pix">21 Example Street</span></div></div><div class="ba-field"><label>Phone</label><div><span class="ba-blur">+1 555 0134</span></div></div></div>
</div></div>
<input type="range" min="0" max="100" value="50" aria-label="Compare the redacted and the original screenshot">
<div class="ba-handle" aria-hidden="true"><span>${icon('ChevronsLeftRight', 20, 2.4)}</span></div>
</div>
<div class="ba-tags" aria-hidden="true"><span>← Shared version</span><span>Original →</span></div>
</div>
</div>
</section>

<section class="section-tight">
<div class="wrap stats">
<div class="card stat reveal"><b><span data-count="0">0</span></b><span>files uploaded, ever</span></div>
<div class="card stat reveal" style="--i:1"><b><span data-count="0">0</span></b><span>ads, accounts or paywalls</span></div>
<div class="card stat reveal" style="--i:2"><b><span data-count="4" data-suffix="K">4K</span></b><span>top recording quality</span></div>
<div class="card stat reveal" style="--i:3"><b><span data-count="60">60</span></b><span>frames per second</span></div>
<div class="card stat reveal" style="--i:4"><b class="grad">$0</b><span>for every feature</span></div>
</div>
</section>

<section class="section" id="why">
<div class="wrap">
<div class="sec-head reveal"><span class="eyebrow">${icon('Heart', 16)}Why FrameShot</span><h2>Why people <span class="grad">choose FrameShot</span></h2><p>It was built around one idea: a capture tool should help you share what’s on your screen, and never take anything from you in return.</p></div>
<div class="why-grid">
${[
  ['Gift', 'Free, with nothing held back', 'There is no paid plan to upgrade to. Every feature, including 4K recording, GIF export and PDF, is free for everyone, with no watermark and no trial timer.'],
  ['ShieldCheck', 'Private by design', 'No accounts and no cloud. FrameShot’s pages can’t connect anywhere except its anonymous install counter, so your captures can’t leave your computer unless you download or copy them.'],
  ['Ruler', 'Accurate, complete captures', 'Full-page captures are checked for gaps, sticky headers are handled, and very long pages are split into full-resolution parts instead of being cut off.'],
  ['Layers', 'One tool instead of three', 'Recorder, screenshot tool and image editor in one extension with one library. Capture, mark up and export without switching apps.'],
  ['WifiOff', 'Works offline', 'Everything runs inside Chrome on your computer, so FrameShot works the same on a plane, on a train or on a slow connection.'],
  ['KeyRound', 'Asks for very little', 'FrameShot sees a page only after you start a capture on it, and turns on your camera or microphone only when you switch them on.'],
]
  .map(([ic, h, p], i) => `<article class="card why spot lift reveal" style="--i:${i % 3}"><h3><span>${icon(ic, 19)}</span>${h}</h3><p>${p}</p></article>`)
  .join('\n')}
</div>
<div class="card never reveal"><b>What you’ll never get:</b><ul>${['Uploads', 'Accounts', 'Watermarks', 'Ads', 'Data selling', 'Paywalls'].map((x) => `<li>${icon('CircleX', 17)}${x}</li>`).join('')}</ul></div>
</div>
</section>

<section class="section section-alt" id="how">
<div class="wrap">
<div class="sec-head reveal"><span class="eyebrow">${icon('Rocket', 16)}Get started</span><h2>Up and running in <span class="grad">three steps</span></h2></div>
<div class="steps">
<article class="card step reveal"><span class="num">1</span><h3>Add it to Chrome</h3><p>Click Add to Chrome, then pin FrameShot to your toolbar so it’s always one click away.</p></article>
<article class="card step reveal" style="--i:1"><span class="num">2</span><h3>Capture or record</h3><p>Click the icon and pick a mode, or press ${k('Alt+Shift+F')} to capture the whole page.</p></article>
<article class="card step reveal" style="--i:2"><span class="num">3</span><h3>Edit and share</h3><p>Mark it up, hide what’s private, then download it, copy it, or turn it into a PDF or a GIF.</p></article>
</div>
<div class="center reveal" style="margin-top:36px">${installButton({ size: 'btn-lg', note: true })}</div>
</div>
</section>

<section class="section" id="privacy">
<div class="wrap">
<div class="band reveal">
<span class="eyebrow">${icon('Lock', 16)}Privacy</span>
<h2 style="margin-top:12px">Your screen is nobody else’s business</h2>
<p>FrameShot was built so it can’t see more than you show it, and can’t send what it sees anywhere.</p>
<div class="band-grid">
<div class="band-item"><span>${icon('ServerOff', 20)}</span><div><b>No cloud, no uploads</b><small>There is no FrameShot cloud. Captures stay in your browser and leave only when you download or copy them.</small></div></div>
<div class="band-item"><span>${icon('MousePointerClick', 20)}</span><div><b>Access only when you ask</b><small>FrameShot reads a page only after you start a capture, through Chrome’s one-time activeTab permission.</small></div></div>
<div class="band-item"><span>${icon('ScreenShare', 20)}</span><div><b>Chrome’s own share dialog</b><small>You choose exactly what to record, and Chrome shows that sharing is on for the whole recording.</small></div></div>
<div class="band-item"><span>${icon('Trash2', 20)}</span><div><b>Delete everything at once</b><small>Clear all local data in Settings, or uninstall: every screenshot and recording is removed from the browser.</small></div></div>
</div>
<a class="btn btn-light" href="/privacy">${icon('FileText', 19)}Read the privacy policy</a>
</div>
</div>
</section>

<section class="section section-alt" id="faq">
<div class="wrap">
<div class="sec-head reveal"><span class="eyebrow">${icon('CircleHelp', 16)}FAQ</span><h2>Questions, <span class="grad">answered</span></h2><p>Can’t find what you’re looking for? Message the developer on <a href="${SITE.telegram}" rel="noopener" target="_blank">Telegram</a>.</p></div>
<div class="faq">
${faq}
</div>
</div>
</section>

<section class="section" id="guides">
<div class="wrap">
<div class="sec-head reveal"><span class="eyebrow">${icon('BookOpen', 16)}Guides</span><h2>Learn the <span class="grad">tricks</span></h2><p>Short, practical guides to screenshots, screen recording and sharing safely.</p></div>
<div class="post-grid">${POSTS.slice(0, 6).map((p, i) => postCard(p, i)).join('\n')}</div>
<p class="center more" style="margin-top:28px"><a href="/blog">Read all guides ${icon('ArrowRight', 16)}</a></p>
</div>
</section>

<section class="section-tight">
<div class="wrap">
<div class="cta reveal">
<h2>Show, don’t tell.</h2>
<p>Capture your first full page or screen recording in seconds. Free forever, and it never leaves your computer.</p>
${installButton({ size: 'btn-lg', light: true, note: true })}
</div>
</div>
</section>`;

  const ld = [
    softwareLd(),
    { '@type': 'WebPage', '@id': `${SITE_URL}/#webpage`, url: `${SITE_URL}/`, name: SITE.title, description: SITE.description, isPartOf: { '@id': `${SITE_URL}/#site` }, about: { '@id': `${SITE_URL}/#app` }, primaryImageOfPage: `${SITE_URL}/og/home.jpg`, inLanguage: 'en' },
    { '@type': 'FAQPage', '@id': `${SITE_URL}/#faq`, mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: strip(q), acceptedAnswer: { '@type': 'Answer', text: strip(a) } })) },
    breadcrumbLd([['Home', '/']]),
  ];
  return {
    path: '/',
    title: SITE.title,
    description: SITE.description,
    og: 'home',
    body,
    ld,
    preload: [`<link rel="preload" as="image" type="image/avif" imagesrcset="${['720', '1440'].map((w) => `${asset(`/assets/img/editor-${w}.avif`)} ${w}w`).join(', ')}" imagesizes="(max-width: 980px) 92vw, 600px" fetchpriority="high">`],
  };
}

