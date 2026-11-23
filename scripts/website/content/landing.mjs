/**
 * Product pages: /features, /screen-recorder, /full-page-screenshot, /faq and /alternatives.
 * Every fact here is one the home page and the guides already state.
 */
import { SITE, SITE_URL } from '../config.mjs';
import { breadcrumbLd, icon, installButton, softwareLd, windowFrame } from '../layout.mjs';
import { FAQ } from './home.mjs';
import { crumbs, DISAMBIGUATION } from './pages.mjs';

const k = (keys) => keys.split('+').map((x) => `<kbd>${x}</kbd>`).join('+');
const strip = (html) => html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const fig = (name, title, alt, caption, dark) =>
  `<figure>${windowFrame(name, { title, alt, sizes: '(max-width: 780px) 92vw, 740px', dark })}<figcaption>${caption}</figcaption></figure>`;
const guide = (slug, text) => `<a href="/blog/${slug}">${text}</a>`;
const faqAnswer = (q) => {
  const hit = FAQ.find(([question]) => question === q);
  if (!hit) throw new Error(`No FAQ answer for "${q}"`);
  return hit[1];
};
/** Questions shown on a landing page (visible only: their FAQPage markup lives on /faq). */
const visibleFaq = (questions) =>
  `<div class="faq faq-inline">${questions.map((q) => `<details><summary>${q}<span class="pm" aria-hidden="true">${icon('Plus', 17, 2.4)}</span></summary><div class="ans">${faqAnswer(q)}</div></details>`).join('\n')}</div>`;

const cta = (title, text) =>
  `<section class="section-tight"><div class="wrap"><div class="cta reveal"><h2>${title}</h2><p>${text}</p>${installButton({ size: 'btn-lg', light: true, note: true })}</div></div></section>`;

/** Shared shell for a product page: header with breadcrumbs, prose with a table of contents, final CTA. */
function productPage({ path, name, h1, lead, sections, ctaTitle, ctaText, type = 'WebPage', extraLd = [], hero }) {
  const body = `
<header class="art-head"><div class="wrap">
${crumbs([['Home', '/'], [name, path]])}
<h1>${h1}</h1>
<p class="lead">${lead}</p>
<div class="cta-row" style="margin-top:22px">${installButton({ size: 'btn-lg' })}</div>
</div></header>
<div class="wrap">
${hero ? `<div class="art-hero">${hero}</div>` : ''}
<div class="art-layout" style="margin-top:20px">
<div class="prose">
${sections.map((s) => `<h2 id="${s.id}">${s.h}</h2>\n${s.html}`).join('\n')}
</div>
<aside class="toc card" aria-label="On this page"><b>On this page</b><ol>${sections.map((s) => `<li><a href="#${s.id}">${s.h}</a></li>`).join('')}</ol></aside>
</div>
</div>
${cta(ctaTitle, ctaText)}`;
  return {
    body,
    ld: [
      { '@type': type, '@id': `${SITE_URL}${path}#webpage`, url: `${SITE_URL}${path}`, name: h1.replace(/<[^>]+>/g, ''), description: strip(lead), isPartOf: { '@id': `${SITE_URL}/#site` }, about: { '@id': `${SITE_URL}/#app` }, primaryImageOfPage: `${SITE_URL}/og/${path.slice(1)}.jpg`, inLanguage: 'en' },
      ...extraLd,
      breadcrumbLd([['Home', '/'], [name, path]]),
    ],
  };
}

// ── /features ──
export function featuresPage() {
  const path = '/features';
  const { body, ld } = productPage({
    path,
    name: 'Features',
    h1: 'Everything FrameShot can do',
    lead: 'FrameShot is a free Chrome extension that records your screen, captures whole web pages and lets you annotate, blur and export the result, with a private library built in. Here is every feature in one place.',
    hero: windowFrame('editor', { title: 'FrameShot Studio — Editor', alt: 'The FrameShot editor with a full-page screenshot, arrows, numbered steps and a text note', sizes: '(max-width: 1220px) 94vw, 1180px', eager: true, priority: true }),
    sections: [
      {
        id: 'screen-recording',
        h: 'Screen recording',
        html: `<p>Record a Chrome tab, a window or your whole screen, right in the browser. You can add your microphone, the tab’s sound and the computer’s sound, and show yourself in a webcam bubble you can move while you record.</p>
<ul>
<li>A tab, a window or your entire screen</li>
<li>Microphone, tab sound and system sound</li>
<li>A movable webcam bubble</li>
<li>From 720p up to 4K, at 15, 30 or 60 frames per second</li>
<li>Saved as MP4 or WebM</li>
</ul>
<p>More on the <a href="/screen-recorder">screen recorder</a>, or follow the guide to ${guide('how-to-record-your-screen-with-audio-in-chrome', 'recording your screen with audio')}.</p>`,
      },
      {
        id: 'screenshots',
        h: 'Screenshots',
        html: `<p>Capture exactly the part of the page you need:</p>
<ul>
<li><strong>Visible area:</strong> what’s on screen, with an optional 3, 5 or 10 second delay so you can open a menu first.</li>
<li><strong>Full page:</strong> the whole page from top to bottom in one image.</li>
<li><strong>Selected area:</strong> drag a box, and scroll to make it taller.</li>
<li><strong>Element:</strong> a single part of the page, such as a table or a comment.</li>
<li><strong>Scrolling panel:</strong> a chat, an inbox or any panel that scrolls on its own.</li>
</ul>
<p>See how it works on the <a href="/full-page-screenshot">full-page screenshot page</a> and in the guide to ${guide('how-to-take-a-scrolling-screenshot', 'scrolling screenshots')}.</p>`,
      },
      {
        id: 'editor',
        h: 'Editor: annotate, blur, pixelate and redact',
        html: `<p>Every capture opens in the editor. Point at what matters with arrows, shapes, text, a highlighter and numbered steps, then hide what’s private with blur, pixelation or a solid redaction box. A solid box is flattened into the exported pixels, so the hidden text simply isn’t in the file.</p>
${fig('redact', 'FrameShot Studio — Editor', 'A billing form in the FrameShot editor with the email blurred and the card number covered by a solid redaction box', 'Blur for background details, a solid box for anything that must stay secret.')}
<p>Read ${guide('how-to-annotate-a-screenshot', 'how to annotate a screenshot')} and ${guide('how-to-blur-or-redact-sensitive-information-in-screenshots', 'when to blur and when to redact')}.</p>`,
      },
      {
        id: 'gifs',
        h: 'GIFs from recordings',
        html: `<p>Turn any part of a recording into a GIF for a chat, a ticket or a README. It’s made on your computer, nothing is uploaded. The guide shows ${guide('how-to-turn-a-screen-recording-into-a-gif', 'how to turn a screen recording into a GIF')}.</p>`,
      },
      {
        id: 'backgrounds',
        h: 'Backgrounds and browser frames',
        html: `<p>Place a capture on a background and give it a browser frame, so it looks good in a slide or a post without opening a design app. Tips in ${guide('how-to-make-screenshots-look-professional', 'how to make screenshots look professional')}.</p>`,
      },
      {
        id: 'library',
        h: 'Library',
        html: `<p>Every screenshot and recording lands in one searchable library in your browser. Sort captures into collections and add tags to find them again. More in ${guide('how-to-organize-screenshots', 'how to organize screenshots')}.</p>`,
      },
      {
        id: 'export',
        h: 'Export formats',
        html: `<p>Download a screenshot as a PNG, JPEG or WebP image or as a multi-page PDF, copy it to the clipboard, or export a whole selection as a ZIP. Recordings are saved as MP4 or WebM. See ${guide('how-to-save-a-web-page-as-a-pdf-or-image', 'how to save a web page as a PDF or image')} and ${guide('how-to-copy-a-screenshot-to-the-clipboard', 'how to copy a screenshot to the clipboard')}.</p>`,
      },
      {
        id: 'privacy',
        h: 'Privacy and offline use',
        html: `<p>Nothing is uploaded: your files stay in the browser on your device until you download or copy them. There is no account or sign-up, no watermark and no paid plan, and FrameShot works offline. The only thing it sends is an anonymous install count, which you can turn off. Details are in the <a href="/privacy">privacy policy</a>.</p>`,
      },
      {
        id: 'requirements',
        h: 'Requirements',
        html: `<p>FrameShot runs in Google Chrome 116 or later on Windows, macOS, Linux and ChromeOS. It’s free forever. Questions? See the <a href="/faq">FAQ</a>, or how FrameShot <a href="/alternatives">compares with built-in tools</a>.</p>`,
      },
    ],
    ctaTitle: 'Try every feature, free',
    ctaText: 'No paid plan, no watermark and no account. Your captures stay on your device.',
    extraLd: [softwareLd()],
  });
  return {
    path,
    file: 'features.html',
    title: 'FrameShot Features: Screen Recorder, Screenshots and Editor',
    description: 'Every FrameShot feature in one place: record your screen with sound and webcam up to 4K, capture full pages, annotate, blur and export. Free, no watermark.',
    og: 'features',
    body,
    ld,
    modified: '2026-11-23',
  };
}

// ── /screen-recorder ──
export function screenRecorderPage() {
  const path = '/screen-recorder';
  const { body, ld } = productPage({
    path,
    name: 'Screen recorder',
    h1: 'Free screen recorder for Chrome with sound and webcam',
    lead: 'FrameShot records a Chrome tab, a window or your whole screen with your microphone, tab sound and system sound, plus a webcam bubble you can move. It’s free, adds no watermark and needs no sign-up.',
    hero: windowFrame('recorder', { title: 'FrameShot Studio — Recorder', alt: 'The FrameShot recorder with a tab selected, microphone and tab sound switched on, and a webcam bubble preview', sizes: '(max-width: 1220px) 94vw, 1180px', eager: true, priority: true }),
    sections: [
      {
        id: 'what-you-can-record',
        h: 'What you can record',
        html: `<p>Choose what to share in Chrome’s own picker: a single tab, one window or your entire screen. Chrome shows that sharing is on for the whole recording, and the video stays on your computer.</p>`,
      },
      {
        id: 'sound',
        h: 'Sound sources',
        html: `<ul>
<li><strong>Tab sound:</strong> sharing a Chrome tab records that tab’s sound on every system.</li>
<li><strong>System sound:</strong> sharing your entire screen records the computer’s sound on Windows and ChromeOS, and on macOS 14.2 or later with Chrome 141 or later.</li>
<li><strong>Microphone:</strong> add your voice to any recording. FrameShot mixes everything into one track.</li>
</ul>
<p>A single window never includes sound in Chrome. The guide to ${guide('how-to-record-your-screen-with-audio-in-chrome', 'recording your screen with audio')} explains what to tick in Chrome’s dialog.</p>`,
      },
      {
        id: 'webcam',
        h: 'Webcam bubble',
        html: `<p>Turn on the camera and your face appears in a round bubble in the corner of the video. You can choose the corner and the size, and change them while recording. It’s ideal for a ${guide('how-to-record-a-video-tutorial-with-your-webcam', 'tutorial with your webcam')} or when you ${guide('how-to-record-a-presentation', 'record a presentation')}.</p>`,
      },
      {
        id: 'quality',
        h: 'Quality and frame rates',
        html: `<p>Record from 720p up to 4K, at 15, 30 or 60 frames per second. Lower settings make smaller files; see ${guide('how-to-reduce-screen-recording-file-size', 'how to reduce screen recording file size')}.</p>`,
      },
      {
        id: 'formats',
        h: 'MP4 or WebM',
        html: `<p>Recordings are saved as MP4 or WebM. Not sure which to pick? Read ${guide('mp4-vs-webm-for-screen-recordings', 'MP4 vs WebM for screen recordings')}.</p>`,
      },
      {
        id: 'gifs',
        h: 'GIFs from recordings',
        html: `<p>Turn any part of a recording into a GIF, made entirely on your computer. Here’s ${guide('how-to-turn-a-screen-recording-into-a-gif', 'how to turn a screen recording into a GIF')}.</p>`,
      },
      {
        id: 'privacy',
        h: 'Private by design',
        html: `<p>There is no account and nothing is uploaded: recordings stay in your browser until you download them, and FrameShot works offline. Read the <a href="/privacy">privacy policy</a>.</p>`,
      },
      {
        id: 'how-to',
        h: 'How to record your screen in Chrome',
        html: `<ol>
<li><strong>Add FrameShot to Chrome</strong> and pin it to the toolbar.</li>
<li><strong>Click the FrameShot icon and choose Record screen.</strong></li>
<li><strong>Switch on your microphone or camera</strong> if you want them.</li>
<li><strong>Pick a tab, a window or your entire screen</strong> in Chrome’s dialog, with tab or system sound if you need it.</li>
<li><strong>Stop the recording</strong> and download it as MP4 or WebM, or make a GIF from part of it.</li>
</ol>
<p>Step-by-step guides for your system: ${guide('how-to-screen-record-on-windows', 'Windows')}, ${guide('how-to-screen-record-on-a-mac-with-sound', 'Mac with sound')}, ${guide('how-to-record-a-google-meet-call', 'Google Meet calls')}, and ${guide('how-to-choose-a-screen-recorder-extension-for-chrome', 'what to check in a screen recorder extension')}.</p>`,
      },
      {
        id: 'questions',
        h: 'Common questions',
        html: visibleFaq(['Can I record my screen with sound?', 'Why is my screen recording silent?', 'Can I show my webcam while recording?', 'Is there a time limit on recordings?']) + `<p>More answers on the <a href="/faq">FAQ page</a>.</p>`,
      },
    ],
    ctaTitle: 'Start recording in Chrome',
    ctaText: 'A free screen recorder with no watermark and no sign-up. Your videos stay on your device.',
  });
  return {
    path,
    file: 'screen-recorder.html',
    title: 'Free Screen Recorder for Chrome, No Watermark | FrameShot',
    description: 'Record a tab, a window or your whole screen in Chrome with mic, system sound and a webcam bubble. Up to 4K, MP4 or WebM, GIF export. Free, no sign-up.',
    og: 'screen-recorder',
    body,
    ld,
    modified: '2026-11-23',
  };
}

// ── /full-page-screenshot ──
export function fullPagePage() {
  const path = '/full-page-screenshot';
  const { body, ld } = productPage({
    path,
    name: 'Full-page screenshots',
    h1: 'Full-page screenshots in Chrome, in one click',
    lead: 'Screenshot keys stop at the edge of your screen. FrameShot scrolls the page for you, captures each part at your screen’s full sharpness and stitches them into one image, then lets you annotate, blur and export it.',
    hero: windowFrame('editor', { title: 'FrameShot Studio — Editor', alt: 'A long web page captured from top to bottom and opened in the FrameShot editor', sizes: '(max-width: 1220px) 94vw, 1180px', eager: true, priority: true }),
    sections: [
      {
        id: 'how-it-works',
        h: 'How full-page capture works',
        html: `<p>One click scrolls the page, stitches every part together and puts the page back exactly as it was.</p>
<ul>
<li>Sticky and fixed headers shown once, not on every slice</li>
<li>Lazy images and endless feeds loaded before the capture</li>
<li>Pages that scroll inside a panel captured correctly</li>
<li>Very long pages split into full-resolution parts, or scaled into one</li>
<li>Your scroll position and the page restored afterwards</li>
</ul>
<p>The ${guide('how-to-take-a-full-page-screenshot-in-chrome', 'full-page screenshot guide')} compares this with Chrome’s built-in options and covers tricky pages.</p>`,
      },
      {
        id: 'other-modes',
        h: 'Visible area, selected area, element and scrolling panel',
        html: `<ul>
<li><strong>Visible area:</strong> exactly what’s on screen.</li>
<li><strong>Selected area:</strong> drag a box, and scroll to extend it past the screen.</li>
<li><strong>Element:</strong> hover and click to capture one part of the page to its edges.</li>
<li><strong>Scrolling panel:</strong> a scrolling screenshot of a chat, an inbox or any panel that scrolls on its own.</li>
</ul>
<p>Guides: ${guide('how-to-screenshot-part-of-a-web-page', 'how to screenshot part of a web page')} and ${guide('how-to-take-a-scrolling-screenshot', 'how to take a scrolling screenshot')}.</p>`,
      },
      {
        id: 'delay',
        h: 'Delay timer',
        html: `<p>Need to open a menu or hover over something first? Visible-area captures can wait 3, 5 or 10 seconds before they start.</p>`,
      },
      {
        id: 'shortcuts',
        h: 'Keyboard shortcuts',
        html: `<p>Press ${k('Alt+Shift+F')} (${k('Option+Shift+F')} on a Mac) for a full page. The other modes are ${k('Alt+Shift+V')} for the visible area, ${k('Alt+Shift+A')} for a selected area and ${k('Alt+Shift+E')} for an element. You can change them at <code>chrome://extensions/shortcuts</code>.</p>`,
      },
      {
        id: 'edit',
        h: 'Annotate and redact',
        html: `<p>The capture opens in the editor, with arrows, shapes, text, a highlighter and numbered steps. Blur, pixelate or redact anything private before you share it. Read ${guide('how-to-annotate-a-screenshot', 'how to annotate a screenshot')} and ${guide('how-to-blur-or-redact-sensitive-information-in-screenshots', 'how to blur or redact sensitive information')}.</p>`,
      },
      {
        id: 'export',
        h: 'Export formats',
        html: `<p>Download a PNG, JPEG or WebP image or a multi-page PDF, copy to the clipboard, or export a selection as a ZIP. See ${guide('how-to-save-a-web-page-as-a-pdf-or-image', 'how to save a web page as a PDF or image')}.</p>`,
      },
      {
        id: 'questions',
        h: 'Common questions',
        html: visibleFaq(['How do I take a full-page screenshot in Chrome?', 'Can I capture only part of a page?', 'Can FrameShot capture PDFs and browser pages?', 'What are the keyboard shortcuts?']) + `<p>More answers on the <a href="/faq">FAQ page</a>.</p>`,
      },
    ],
    ctaTitle: 'Capture your first full page',
    ctaText: 'A free full page screenshot extension for Chrome. No watermark, no account, nothing uploaded.',
  });
  return {
    path,
    file: 'full-page-screenshot.html',
    title: 'Full Page Screenshot Extension for Chrome | FrameShot',
    description: 'Capture a whole web page in Chrome in one click, plus visible area, region, element or scrolling panel. Annotate, blur and export PNG, JPEG, WebP or PDF.',
    og: 'full-page-screenshot',
    body,
    ld,
    modified: '2026-11-23',
  };
}

// ── /faq ──
const DISAMBIGUATION_Q = 'Is this the same as other extensions called Frameshot?';
const GROUPS = [
  ['pricing-privacy', 'Pricing and privacy', ['Is FrameShot really free?', 'Does FrameShot upload my screenshots or recordings?', 'Does FrameShot add a watermark?', 'What permissions does FrameShot need, and why?', 'How can I support FrameShot?', DISAMBIGUATION_Q]],
  ['capturing', 'Capturing', ['How do I take a full-page screenshot in Chrome?', 'Can I capture only part of a page?', 'How do I hide passwords or personal details in a screenshot?', 'What are the keyboard shortcuts?', 'Can FrameShot capture PDFs and browser pages?']],
  ['recording', 'Recording', ['Can I record my screen with sound?', 'Why is my screen recording silent?', 'Can I show my webcam while recording?', 'Is there a time limit on recordings?']],
  ['files-storage', 'Files and storage', ['Which file formats can I save?', 'Where are my files stored, and how do I delete them?']],
  ['compatibility', 'Compatibility', ['Which browsers and systems are supported?', 'Does FrameShot work offline?']],
];

export function faqPage() {
  const path = '/faq';
  const answer = (q) => (q === DISAMBIGUATION_Q ? `<p>No. ${DISAMBIGUATION}</p>` : faqAnswer(q));
  // Every home page question appears exactly once.
  const listed = GROUPS.flatMap((g) => g[2]).filter((q) => q !== DISAMBIGUATION_Q);
  const missing = FAQ.map(([q]) => q).filter((q) => !listed.includes(q));
  if (missing.length || new Set(listed).size !== listed.length) throw new Error(`FAQ groups out of sync: ${missing.join(', ')}`);

  const body = `
<header class="art-head"><div class="wrap">
${crumbs([['Home', '/'], ['FAQ', path]])}
<h1>FrameShot questions, answered</h1>
<p class="lead">Everything people ask about FrameShot: what it costs, what it does with your files, how capturing and recording work, and which systems it runs on.</p>
</div></header>
<div class="wrap">
<div class="art-layout" style="margin-top:20px">
<div>
${GROUPS.map(([id, h, qs]) => `<section class="faq-group" aria-labelledby="${id}"><h2 id="${id}">${h}</h2><div class="faq faq-inline">${qs.map((q) => `<details><summary><h3>${q}</h3><span class="pm" aria-hidden="true">${icon('Plus', 17, 2.4)}</span></summary><div class="ans">${answer(q)}</div></details>`).join('\n')}</div></section>`).join('\n')}
<p class="subtle" style="margin-top:28px">Still have a question? Message the developer on <a href="${SITE.telegram}" rel="noopener" target="_blank">Telegram</a>, or browse <a href="/features">every feature</a> and <a href="/blog">the guides</a>.</p>
</div>
<aside class="toc card" aria-label="On this page"><b>On this page</b><ol>${GROUPS.map(([id, h]) => `<li><a href="#${id}">${h}</a></li>`).join('')}</ol></aside>
</div>
</div>
${cta('Ready to try it?', 'Free forever, no watermark, no account. Add FrameShot to Chrome in a few seconds.')}`;
  const all = GROUPS.flatMap((g) => g[2]);
  return {
    path,
    file: 'faq.html',
    title: 'FrameShot FAQ: Free, Private Screen Recorder and Screenshots',
    description: 'Answers about FrameShot: is it free, does it upload files, which browsers it supports, offline use, storage, watermarks, formats and how to delete your data.',
    og: 'faq',
    body,
    modified: '2026-11-23',
    ld: [
      { '@type': 'FAQPage', '@id': `${SITE_URL}${path}#webpage`, url: `${SITE_URL}${path}`, name: 'FrameShot questions, answered', isPartOf: { '@id': `${SITE_URL}/#site` }, about: { '@id': `${SITE_URL}/#app` }, inLanguage: 'en', mainEntity: all.map((q) => ({ '@type': 'Question', name: strip(q), acceptedAnswer: { '@type': 'Answer', text: strip(answer(q)) } })) },
      breadcrumbLd([['Home', '/'], ['FAQ', path]]),
    ],
  };
}

// ── /alternatives ──
export function alternativesPage() {
  const path = '/alternatives';
  const rows = [
    ['FrameShot', `One click, or ${k('Alt+Shift+F')}; sticky headers and lazy images handled`, 'A tab, a window or the whole screen, with microphone, tab and system sound, and a webcam bubble', 'Arrows, shapes, text, numbered steps, blur, pixelate and redaction', 'Free, no watermark, no account; nothing uploaded'],
    ['Chrome DevTools “Capture full size screenshot”', 'Yes, as a PNG; simple pages work best, panels that scroll inside a box come out as the visible part only', 'No', 'No', 'No install needed'],
    ['Chrome Print to PDF', 'A PDF with selectable text, but in the site’s print layout and cut into paper-sized pages', 'No', 'No', 'Good for saving an article to read later'],
    ['Windows Snipping Tool', 'No: captures what’s on the screen and nothing more', 'An area or the full screen; microphone and system sound on recent versions; no webcam bubble', 'Basic markup', 'Built into Windows 11'],
    ['Xbox Game Bar (Windows)', 'No', `One app window, not the desktop or File Explorer (${k('Win+Alt+R')}); the app’s sound, microphone optional; no webcam bubble`, 'No', 'Made for games and single apps'],
    ['macOS Cmd+Shift+5 and QuickTime', 'No: macOS has no scrolling screenshot', 'The screen or part of it; your microphone if you choose one, but not the Mac’s own sound; no webcam bubble', 'Basic markup', 'Built into macOS'],
    ['ChromeOS Screen capture', 'No: captures what’s on the screen', 'Screen record in the same toolbar, with a microphone option', 'Simple edits such as cropping', 'Built into ChromeOS; may be turned off on managed Chromebooks'],
  ];
  const table = `<div class="table-wrap"><table>
<caption>FrameShot and built-in tools for full-page screenshots and screen recording</caption>
<thead><tr><th scope="col">Tool</th><th scope="col">Full-page screenshot</th><th scope="col">Screen recording</th><th scope="col">Annotate and redact</th><th scope="col">Notes</th></tr></thead>
<tbody>
${rows.map(([tool, ...cells]) => `<tr><th scope="row">${tool}</th>${cells.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('\n')}
</tbody>
</table></div>`;
  const { body, ld } = productPage({
    path,
    name: 'Compared with built-in tools',
    h1: 'FrameShot compared with built-in tools',
    lead: 'Chrome, Windows, macOS and ChromeOS all come with some way to take a screenshot or record the screen. Here is what each built-in tool does well, where it stops, and when FrameShot is the better fit.',
    sections: [
      {
        id: 'at-a-glance',
        h: 'At a glance',
        html: `${table}
<p>Built-in tools capture other apps and the desktop too; FrameShot works on web pages in Chrome, and records any tab, window or screen you share.</p>`,
      },
      {
        id: 'chrome',
        h: 'Chrome DevTools and Print to PDF',
        html: `<p>Chrome hides a <strong>Capture full size screenshot</strong> command in DevTools. It works by pretending the window is as tall as the page, which is fast but has side effects: pages that scroll inside a panel usually come out as just the visible part, fixed headers can land in odd places, images that load on scroll may be missing, and there is no way to annotate or blur the result. <strong>Print to PDF</strong> keeps text selectable, but it uses the site’s print layout and cuts the page into paper-sized sheets. Details in the ${guide('how-to-take-a-full-page-screenshot-in-chrome', 'full-page screenshot guide')} and in ${guide('how-to-save-a-web-page-as-a-pdf-or-image', 'how to save a web page as a PDF or image')}.</p>`,
      },
      {
        id: 'windows',
        h: 'Windows: Snipping Tool and Xbox Game Bar',
        html: `<p>On Windows, ${k('Win+Shift+S')} and the Print Screen key capture what’s on the screen and nothing more, so there is no scrolling screenshot. Snipping Tool can record an area or the full screen, with microphone and system sound on recent versions. Xbox Game Bar records one app window, not the desktop or File Explorer. Neither adds a webcam bubble. See ${guide('how-to-screenshot-on-windows', 'how to screenshot on Windows')} and ${guide('how-to-screen-record-on-windows', 'how to screen record on Windows 11')}.</p>`,
      },
      {
        id: 'macos',
        h: 'macOS: Cmd+Shift+5 and QuickTime',
        html: `<p>${k('Cmd+Shift+5')} and QuickTime record your microphone if you choose one, but not the Mac’s own sound, like a video or a call playing in an app, without extra software. macOS has no scrolling screenshot either. See ${guide('how-to-screenshot-on-a-mac', 'how to screenshot on a Mac')} and ${guide('how-to-screen-record-on-a-mac-with-sound', 'how to screen record on a Mac with sound')}.</p>`,
      },
      {
        id: 'chromeos',
        h: 'ChromeOS: Screen capture',
        html: `<p>On a Chromebook, Quick Settings → Screen capture takes screenshots and has a Screen record option with a microphone setting. Schools and workplaces can turn it off on managed Chromebooks. The guide to ${guide('how-to-screenshot-on-a-chromebook', 'screenshots on a Chromebook')} covers the shortcuts.</p>`,
      },
      {
        id: 'when-frameshot',
        h: 'When FrameShot is the better fit',
        html: `<ul>
<li>You need a whole web page, a scrolling panel or a single element, not just what’s on screen.</li>
<li>You want to record a tab with its sound, add your microphone and show your webcam.</li>
<li>You want to annotate, blur or redact before sharing, and export PNG, JPEG, WebP, PDF, MP4, WebM or a GIF.</li>
<li>You want it free, with no watermark and no account, and your files kept on your device.</li>
</ul>
<p>See <a href="/features">every feature</a>, the <a href="/screen-recorder">screen recorder</a> and <a href="/full-page-screenshot">full-page screenshots</a>.</p>`,
      },
    ],
    ctaTitle: 'Try FrameShot alongside your built-in tools',
    ctaText: 'Free, no watermark, no account. It works in Chrome 116 or later on Windows, macOS, Linux and ChromeOS.',
  });
  return {
    path,
    file: 'alternatives.html',
    title: 'FrameShot vs Built-in Screenshot and Screen Recording Tools',
    description: 'How FrameShot compares with Chrome DevTools capture, Windows Snipping Tool and Game Bar, and macOS Cmd+Shift+5 for full-page screenshots and recording.',
    og: 'alternatives',
    body,
    ld,
    modified: '2026-11-23',
  };
}
