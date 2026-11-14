/** Blog articles, batch B. Every product fact here matches the extension's code, FEATURES.md and README.md. */
import { icon, windowFrame } from '../layout.mjs';

const k = (keys) => keys.split('+').map((x) => `<kbd>${x}</kbd>`).join('+');
const callout = (ic, html) => `<div class="callout">${icon(ic, 20)}<div>${html}</div></div>`;
const fig = (name, title, alt, caption, dark) =>
  `<figure>${windowFrame(name, { title, alt, sizes: '(max-width: 780px) 92vw, 740px', dark })}<figcaption>${caption}</figcaption></figure>`;

export const META_B = [
  {
    slug: 'how-to-screenshot-part-of-a-web-page',
    title: 'How to Screenshot Part of a Web Page in Chrome',
    description: 'Screenshot part of a web page or capture a single element in Chrome: system snipping tools, DevTools commands and an extension that scrolls past the screen.',
    tag: 'Guide',
    image: 'editor',
    alt: 'A captured section of a web page open in the FrameShot editor, ready to crop and annotate',
    date: '2026-11-14',
    keywords: [
      'screenshot part of a web page',
      'capture an element',
      'screenshot a specific area in chrome',
      'capture node screenshot',
      'capture area screenshot devtools',
      'screenshot part of a page bigger than the screen',
      'screenshot a table on a web page',
    ],
  },
  {
    slug: 'how-to-annotate-a-screenshot',
    title: 'How to Annotate a Screenshot: Arrows, Text and Steps',
    description: 'How to annotate a screenshot so it’s clear at a glance: which tools to use, simple design rules, and worked examples for bug reports, tutorials and feedback.',
    tag: 'Tips',
    image: 'editor',
    alt: 'A screenshot in the FrameShot editor marked up with arrows, numbered step markers and a text note',
    date: '2026-11-14',
    keywords: [
      'how to annotate a screenshot',
      'add arrows to a screenshot',
      'add text to a screenshot',
      'number steps on a screenshot',
      'screenshot markup',
      'annotate screenshots for documentation',
      'highlight part of a screenshot',
    ],
  },
  {
    slug: 'how-to-save-a-web-page-as-a-pdf-or-image',
    title: 'How to Save a Web Page as a PDF or Image in Chrome',
    description: 'Save a web page as a PDF with Chrome’s print dialog, or as a PDF or image that looks exactly like the screen. Which to pick, plus PNG, JPEG and WebP compared.',
    tag: 'Guide',
    image: 'library-light',
    alt: 'The FrameShot library with saved page captures, ready to export as PDF or image files',
    date: '2026-11-14',
    keywords: [
      'save web page as pdf',
      'save web page as image',
      'chrome print to pdf',
      'save a web page as pdf without cutting pages',
      'web page to png',
      'save receipt as pdf',
      'png vs jpeg vs webp',
    ],
  },
  {
    slug: 'how-to-record-a-video-tutorial-with-your-webcam',
    title: 'How to Record Your Screen and Webcam for a Tutorial',
    description: 'Record screen and webcam for a tutorial video: plan a short script, set up your mic and camera, choose what to share, record in Chrome and export MP4.',
    tag: 'Recording',
    image: 'recorder',
    alt: 'The FrameShot recorder with the microphone on, a webcam bubble preview and the record button',
    date: '2026-11-14',
    keywords: [
      'record screen and webcam',
      'how to make a tutorial video',
      'screen recording with webcam in chrome',
      'record a tutorial video',
      'webcam bubble screen recording',
      'tutorial video script',
      'record screen with face cam',
    ],
  },
  {
    slug: 'how-to-choose-a-screen-recorder-extension-for-chrome',
    title: 'Screen Recorder Extensions for Chrome: What to Check',
    description: 'What to check in a screen recorder extension for Chrome before you install: watermarks, time limits, uploads, permissions, sound, formats and privacy.',
    tag: 'Guide',
    image: 'library-dark',
    alt: 'The FrameShot library in dark mode with screen recordings and screenshots stored on the computer',
    date: '2026-11-14',
    keywords: [
      'screen recorder extension for chrome',
      'chrome screen recorder extension permissions',
      'screen recorder without watermark',
      'screen recorder no sign up',
      'private screen recorder chrome',
      'chrome extension permissions explained',
      'record screen chrome extension mp4',
    ],
  },
];

export const BODIES_B = {
  'how-to-screenshot-part-of-a-web-page': {
    intro: `<p>To screenshot part of a web page, drag a box over the area you want with your computer’s snipping shortcut, use the <strong>Capture node screenshot</strong> command in Chrome DevTools to grab one element, or use an extension that can select an area and keep going past the bottom of the screen. The first is fastest, the second is the most precise, and the third is the only one that handles a part that is taller than your screen.</p>
<p>This guide walks through all of them, then covers the awkward cases: long tables, comment threads, charts with tooltips, and partial screenshots that come out blurry.</p>`,
    sections: [
      {
        id: 'system-tools',
        h: 'How do you screenshot part of the screen on Windows, Mac and Chromebook?',
        html: `<p>Every desktop system has a built-in way to drag a box around part of the screen. They don’t know anything about web pages, so they capture exactly the pixels you can see, but for a quick grab that is often all you need.</p>
<ul>
<li><strong>Windows:</strong> press ${k('Win+Shift+S')}. The screen dims and a small bar at the top lets you choose a rectangle, a freeform shape, a window or the full screen. Drag your box and the image goes to the clipboard. Click the notification that appears to open it in Snipping Tool, where you can mark it up and save it.</li>
<li><strong>Mac:</strong> press ${k('Cmd+Shift+4')} and drag. The screenshot is saved to your desktop by default. Hold ${k('Control')} while you drag to copy it to the clipboard instead, or press ${k('Cmd+Shift+5')} for a toolbar with more options, such as where to save.</li>
<li><strong>Chromebook:</strong> press ${k('Ctrl+Shift')} and the Show windows key, then drag. Our <a href="/blog/how-to-screenshot-on-a-chromebook">Chromebook screenshot guide</a> covers the other modes and keyboards without that key.</li>
</ul>
<p>The limits are the same everywhere. You can only capture what fits on the screen at that moment, your selection is only as accurate as your hand, and the image has the resolution of your display, nothing more. If you need the visible screen as a whole, our guide on <a href="/blog/how-to-take-a-screenshot-in-chrome">how to take a screenshot in Chrome</a> compares the options.</p>`,
      },
      {
        id: 'devtools',
        h: 'How to capture an element with Chrome DevTools',
        html: `<p>Chrome’s developer tools can screenshot a single part of a page exactly to its edges, with no extension. It sounds technical, but it takes four steps:</p>
<ol>
<li><strong>Right-click the thing you want</strong>, such as a pricing card or a comment, and choose <strong>Inspect</strong>. DevTools opens with that part of the page selected in the <strong>Elements</strong> panel.</li>
<li><strong>Check the selection.</strong> As you hover over lines in the Elements panel, Chrome highlights the matching part of the page. If only a word or an icon is highlighted, click the line above it to move up to the box that contains it.</li>
<li><strong>Right-click the selected line</strong> and choose <strong>Capture node screenshot</strong>.</li>
<li><strong>Find the PNG</strong> in your Downloads folder.</li>
</ol>
<p>A node screenshot usually includes the whole element, even the parts scrolled out of view, which makes it handy for a long card or form. For a free-form area instead, open the Command Menu with ${k('Ctrl+Shift+P')} (${k('Cmd+Shift+P')} on a Mac), type <code>screenshot</code> and choose <strong>Capture area screenshot</strong>, then drag a box over the page.</p>
<p>The downsides: finding the right line in the Elements panel can take a few tries on complicated pages, there is no preview before the file is saved, and you need another app to crop, annotate or blur the result.</p>`,
      },
      {
        id: 'frameshot-area',
        h: 'How to screenshot a selected area, even past the screen',
        html: `<p><a href="/">FrameShot, a screenshot and screen recording extension for Chrome</a>, has a <strong>Selected area</strong> mode that works like a snipping tool inside the page, with one big difference: you can scroll while you select, and the capture grows with you.</p>
<ol>
<li><strong>Click the FrameShot icon and choose Selected area</strong>, or press ${k('Alt+Shift+A')} (${k('Option+Shift+A')} on a Mac).</li>
<li><strong>Drag a box</strong> over the part you want.</li>
<li><strong>Adjust it.</strong> Drag the handles to resize, drag the middle to move it, or use the arrow keys for small nudges.</li>
<li><strong>Need more?</strong> Scroll the page down. The selection extends beyond the screen, and FrameShot captures and stitches the extra part for you.</li>
<li><strong>Press ${k('Enter')}</strong> to capture, or ${k('Esc')} to cancel. The image opens in the editor, where you can crop, annotate and blur it, then download it or copy it to the clipboard.</li>
</ol>
${fig('popup', 'FrameShot popup', 'The FrameShot popup listing Visible area, Full page, Selected area and Element capture modes, with a Record screen button', 'Selected area and Element are one click away in the popup.')}
<p>That scroll-to-extend trick is what makes partial captures of long sections practical: a full set of search results, a long settings form or a whole article without the sidebar, all in one clean image. If you want everything from top to bottom instead, a <a href="/blog/how-to-take-a-full-page-screenshot-in-chrome">full-page screenshot</a> is quicker, and our guide to <a href="/blog/how-to-take-a-scrolling-screenshot">scrolling screenshots</a> explains the other ways to capture more than one screen.</p>`,
      },
      {
        id: 'frameshot-element',
        h: 'How to capture an element exactly to its edges',
        html: `<p>When the part you want is one block on the page, such as a chart, a product card, a tweet-style post or a single comment, dragging a box by hand always leaves a sliver of background on one side. FrameShot’s <strong>Element</strong> mode captures it to the exact pixel instead.</p>
<ol>
<li><strong>Choose Element</strong> in the popup, or press ${k('Alt+Shift+E')} (${k('Option+Shift+E')} on a Mac).</li>
<li><strong>Hover over the page.</strong> FrameShot highlights the element under your pointer.</li>
<li><strong>Fine-tune with the arrow keys.</strong> Press ${k('↑')} to step out to the parent element, for example from one comment to the whole thread, and ${k('↓')} to step back in.</li>
<li><strong>Click</strong> to capture. The result opens in the editor.</li>
</ol>
<p>Element mode is the no-DevTools version of a node screenshot. It is the quickest way to get tidy, consistent images of interface parts for documentation or a design review.</p>`,
      },
      {
        id: 'comparison',
        h: 'Which method should you use?',
        html: `<table>
<thead><tr><th></th><th>System snipping tool</th><th>DevTools</th><th>FrameShot Selected area</th><th>FrameShot Element</th></tr></thead>
<tbody>
<tr><th>Works outside the browser</th><td>Yes</td><td>No</td><td>No</td><td>No</td></tr>
<tr><th>Taller than the screen</th><td>No</td><td>Node screenshots usually</td><td>Yes, scroll to extend</td><td>Visible element</td></tr>
<tr><th>Exact edges</th><td>By hand</td><td>Yes</td><td>Handles and arrow keys</td><td>Yes</td></tr>
<tr><th>Annotate and blur</th><td>Basic pen tools</td><td>No</td><td>Built-in editor</td><td>Built-in editor</td></tr>
<tr><th>Best for</th><td>Quick grabs, any app</td><td>One-off element shots</td><td>Long sections, free-form areas</td><td>Cards, charts, comments</td></tr>
</tbody>
</table>
<p>If you only ever need a quick grab of what’s on screen, the system shortcut is hard to beat. If you capture parts of web pages often, for tickets, docs or reviews, an in-page tool saves the time you would otherwise spend cropping.</p>`,
      },
      {
        id: 'tricky-parts',
        h: 'Tips for tables, comments and charts',
        html: `<ul>
<li><strong>Long tables.</strong> If the whole page scrolls, use Selected area and scroll down to the last row. If the table scrolls inside its own box, choose <strong>Scrolling panel</strong> in the FrameShot popup and click the table: FrameShot captures the panel’s full content, not just the rows you can see.</li>
<li><strong>Comment threads.</strong> Use Element on one comment, then press ${k('↑')} until the highlight covers the replies too. Expand collapsed replies before you start.</li>
<li><strong>Charts.</strong> Wait for the chart’s entry animation to finish before capturing. For a tooltip that only appears while you hover, use <strong>Visible area</strong> with a 3, 5 or 10 second delay, move your pointer onto the chart, and crop the result in the editor.</li>
<li><strong>Menus and dropdowns.</strong> These close as soon as you click anything, including a capture button. The delayed Visible area capture solves this too.</li>
<li><strong>Cookie banners and chat bubbles.</strong> Close them first, or they may sit right on top of the part you want.</li>
<li><strong>Private details.</strong> A partial screenshot can still include a name or an email address at its edge. Check before you share, and see our guide to <a href="/blog/how-to-blur-or-redact-sensitive-information-in-screenshots">blurring and redacting screenshots</a>.</li>
</ul>
${callout('Info', '<p>No extension can capture Chrome’s own pages, such as <code>chrome://settings</code>, the Chrome Web Store or other extensions’ pages. Chrome blocks them for security. A system snipping tool still works there.</p>')}`,
      },
      {
        id: 'sharpness',
        h: 'How to keep a partial screenshot sharp',
        html: `<p>Small captures blur easily, because they contain few pixels to begin with. A few habits keep them crisp:</p>
<ul>
<li><strong>Capture at your screen’s full resolution.</strong> FrameShot captures at your display’s full sharpness, so on a high-resolution screen with twice the usual pixel density a 300-pixel-wide card becomes a 600-pixel-wide image with crisp text.</li>
<li><strong>Zoom the page in before you capture</strong> when you need a small element bigger. Use ${k('Ctrl++')} (${k('Cmd++')} on a Mac), then capture. Set the zoom first: changing it during a capture interrupts it, and FrameShot tells you if that happens.</li>
<li><strong>Save text as PNG.</strong> JPEG blurs the edges of letters and lines. Use PNG for interface screenshots, and JPEG or WebP only when file size matters more. Our guide to <a href="/blog/how-to-save-a-web-page-as-a-pdf-or-image">saving a web page as a PDF or image</a> compares the formats.</li>
<li><strong>Crop, don’t shrink.</strong> If the image is too big, crop away what you don’t need instead of scaling the whole thing down.</li>
<li><strong>Don’t screenshot a screenshot.</strong> Capturing an image of an image loses sharpness each time. Go back to the page and capture it again.</li>
</ul>`,
      },
      {
        id: 'faq',
        h: 'Common questions',
        html: `<h3>How do I screenshot only part of a page in Chrome?</h3>
<p>Press ${k('Win+Shift+S')} on Windows or ${k('Cmd+Shift+4')} on a Mac and drag a box, or use an extension’s area mode. In FrameShot, press ${k('Alt+Shift+A')}, drag a box and press ${k('Enter')}.</p>
<h3>Can I screenshot a part of a page that’s bigger than my screen?</h3>
<p>Yes, but not with system tools. In FrameShot’s Selected area mode, scroll the page while selecting and the capture extends. DevTools’ Capture node screenshot also usually captures a whole element, even the off-screen part.</p>
<h3>How do I screenshot a specific element without an extension?</h3>
<p>Right-click it, choose <strong>Inspect</strong>, then right-click the highlighted line in the Elements panel and choose <strong>Capture node screenshot</strong>. Chrome saves a PNG to your Downloads folder.</p>
<h3>Why does my partial screenshot look blurry?</h3>
<p>Usually because it was saved as JPEG, scaled down, or captured from a low-resolution screen. Save as PNG, crop instead of resizing, and zoom the page in before capturing small elements.</p>
<h3>How do I copy a partial screenshot straight to the clipboard?</h3>
<p>On Windows, ${k('Win+Shift+S')} copies automatically. On a Mac, hold ${k('Control')} while dragging. In FrameShot, use <strong>Copy</strong> in the editor to put the image on the clipboard as a PNG, ready to paste into a chat or a <a href="/blog/better-bug-reports-with-screenshots-and-screen-recordings">bug report</a>. Want to point at something first? See <a href="/blog/how-to-annotate-a-screenshot">how to annotate a screenshot</a>.</p>`,
      },
    ],
  },

  'how-to-annotate-a-screenshot': {
    intro: `<p>To annotate a screenshot, open it in an image editor, add an arrow or a box to point at what matters, number the steps if there is a sequence, add a short text label, and blur or redact anything private before you export. That is the whole technique. What separates a clear annotation from a cluttered one is restraint: one idea per screenshot, strong contrast and the same colours every time.</p>
<p>Below you’ll find which tool to use for which job, a step-by-step walkthrough, a few simple design rules, and worked examples for bug reports, tutorials and design feedback.</p>`,
    sections: [
      {
        id: 'tools',
        h: 'Which annotation tools do you need?',
        html: `<p>Most screenshot editors offer the same handful of tools. Each one has a job it does well and a way it gets misused:</p>
<table>
<thead><tr><th>Tool</th><th>Use it for</th><th>Avoid</th></tr></thead>
<tbody>
<tr><td><strong>Arrow</strong></td><td>Pointing at one small thing: a button, a field, a number</td><td>Several arrows crossing each other</td></tr>
<tr><td><strong>Rectangle or ellipse</strong></td><td>Framing an area: a section, a row, a message</td><td>Filled shapes that hide what they frame</td></tr>
<tr><td><strong>Numbered steps</strong></td><td>Showing an order: click here, then here, then here</td><td>Numbers that don’t match the written steps</td></tr>
<tr><td><strong>Text</strong></td><td>Short labels: “Expected $25”, “Click Save”</td><td>Whole paragraphs on the image</td></tr>
<tr><td><strong>Highlighter</strong></td><td>Marking a line of text while keeping it readable</td><td>Highlighting half the screen</td></tr>
<tr><td><strong>Pen</strong></td><td>Quick circles and underlines in informal feedback</td><td>Anything that needs to look tidy</td></tr>
<tr><td><strong>Blur, pixelate, redact</strong></td><td>Hiding names, emails, tokens and card numbers</td><td>Blur for secrets: use a solid box</td></tr>
<tr><td><strong>Crop</strong></td><td>Removing everything that isn’t part of the point</td><td>Cropping so tight the context is lost</td></tr>
</tbody>
</table>`,
      },
      {
        id: 'how-to',
        h: 'How to annotate a screenshot, step by step',
        html: `<p>Here is the process using the editor in <a href="/">FrameShot, a screenshot tool for Chrome</a>, as the example. The same order works in any editor, and doing it in this order saves rework.</p>
<ol>
<li><strong>Capture or import the image.</strong> Take a screenshot with FrameShot, or bring an existing image into the library with the file picker, by pasting it, or by dragging it in. Open it in the editor.</li>
<li><strong>Crop first.</strong> Cut away the parts that don’t matter before you add anything. The crop tool has free, 1:1, 4:3, 16:9 and 9:16 presets if the image has to fit a slide or a post.</li>
<li><strong>Hide private details.</strong> Use <strong>Redact (solid)</strong> on anything secret and <strong>Blur</strong> or <strong>Pixelate</strong> on things you only want to tone down. Doing this early means you won’t forget.</li>
<li><strong>Point at the main thing.</strong> Add one arrow or one box. Arrows can have one head or two, and boxes can be plain, rounded or an ellipse, with a border, a fill or both.</li>
<li><strong>Number the sequence.</strong> If there are steps, use the numbered step markers. They count themselves, so the next marker you place is always the next number.</li>
<li><strong>Label it.</strong> Add short text. Give it a background or an outline so it stays readable on a busy image, and double-click any text to change it later.</li>
<li><strong>Tidy up.</strong> Select several marks with ${k('Shift')} or by dragging a box around them, nudge them with the arrow keys, and use the layer list to put a label above an arrow. Undo goes back up to 100 steps.</li>
<li><strong>Export.</strong> Download as PNG for sharp text, or copy to the clipboard and paste it where it’s needed.</li>
</ol>
${fig('editor', 'FrameShot Studio — Editor', 'A web page screenshot in the FrameShot editor with an arrow, numbered step markers 1 to 3 and a text note with a background', 'One arrow, three numbered markers and one short note: enough to explain the page.')}
<p>Every mark stays editable because FrameShot keeps the original image and saves your edits separately, so you can come back from the library tomorrow and change a label without starting again.</p>`,
      },
      {
        id: 'design-rules',
        h: 'Design rules for clear annotations',
        html: `<ul>
<li><strong>One idea per screenshot.</strong> If you need to explain three things, take three screenshots. A single image with eight arrows makes the reader work out which one matters.</li>
<li><strong>Contrast beats style.</strong> Pick a colour that doesn’t appear in the screenshot. A red arrow on a red error banner disappears. On busy images, a slightly thicker line or a text background does more than any font choice.</li>
<li><strong>Keep colours consistent.</strong> Decide on a meaning and stick to it, for example red for the problem, green for the correct result and one neutral colour for labels. Readers learn the system after two or three images.</li>
<li><strong>Number in reading order.</strong> Place markers top to bottom and left to right where you can, and make sure the numbers on the image match the numbered steps in your text.</li>
<li><strong>Don’t cover the content.</strong> Put the arrow’s tail in empty space and its head next to the target, not on top of it. Frame things with an outline rather than a filled shape.</li>
<li><strong>Short labels.</strong> Three to six words is plenty. The longer explanation belongs in the message, the ticket or the article around the image.</li>
<li><strong>Use the highlighter for text.</strong> It blends with what is underneath, so the words stay readable through the colour, which an opaque box can’t do.</li>
</ul>
${callout('Lightbulb', '<p>Squint at your finished screenshot. The first thing you notice should be the thing you meant to point at. If it’s an arrow, a label or the logo in the corner instead, simplify.</p>')}`,
      },
      {
        id: 'bug-reports',
        h: 'Example: annotating a screenshot for a bug report',
        html: `<p>Say the checkout total ignores a discount code. A useful screenshot shows three things: where the code was entered, the wrong total, and what the total should have been.</p>
<ol>
<li>Capture the checkout area with enough context to recognise the page, such as the order summary and the header.</li>
<li>Place step marker <strong>1</strong> on the discount field and <strong>2</strong> on the Apply button.</li>
<li>Draw a red box around the total and add a text label next to it: “Expected $25.00”.</li>
<li>Redact the customer’s name and address with a solid box.</li>
<li>Paste it into the ticket under steps that are also numbered 1 and 2.</li>
</ol>
<p>A developer can now see the problem without reading a word. When the bug is about timing or a sequence of clicks, attach a short recording too. Our guide to <a href="/blog/better-bug-reports-with-screenshots-and-screen-recordings">better bug reports</a> has a full template.</p>`,
      },
      {
        id: 'tutorials',
        h: 'Example: screenshots for tutorials and documentation',
        html: `<p>Tutorial screenshots are read in a series, so consistency matters more than in any one image.</p>
<ul>
<li><strong>Same size, same crop.</strong> Capture the same part of the interface each time. FrameShot’s Element mode makes this easy, because it captures a panel exactly to its edges, as described in <a href="/blog/how-to-screenshot-part-of-a-web-page">how to screenshot part of a web page</a>.</li>
<li><strong>One step per image</strong>, with a single numbered marker or arrow on the button to click.</li>
<li><strong>Write the action in the text, not on the image.</strong> “Click <strong>Save</strong>” in the article, a marker on the button in the screenshot.</li>
<li><strong>Use the same colour and marker style throughout.</strong> FrameShot remembers your last tool style, so it carries over from one image to the next.</li>
<li><strong>Use demo data.</strong> Real names and emails have a way of turning up in published docs.</li>
</ul>
<p>For a launch post or a slide, the composer can place a finished screenshot on a gradient background with padding, rounded corners, a shadow and a light or dark browser frame.</p>`,
      },
      {
        id: 'design-feedback',
        h: 'Example: giving design feedback on a screenshot',
        html: `<p>Design feedback works best when every comment is tied to a spot on the image and a number in the message.</p>
<ul>
<li>Place a numbered marker on each spot you want to talk about, then write your comments as a numbered list in the message: “1. This heading wraps on narrow screens. 2. The button contrast feels low.”</li>
<li>Use an ellipse for areas and an arrow for single details. Avoid writing opinions on the image itself; it reads as louder than you meant.</li>
<li>Use symbols for quick verdicts: a check for what works, a cross for what doesn’t, a question mark for what you’re unsure about.</li>
<li>For spacing and alignment, a dashed line between two edges shows the problem better than a paragraph.</li>
<li>Compare before and after. FrameShot’s library can show two screenshots side by side, as an overlay or as a difference image.</li>
</ul>`,
      },
      {
        id: 'privacy',
        h: 'Blur or redact before you share',
        html: `<p>Annotation is also the moment to remove what shouldn’t be seen. Look at the whole screenshot, not just the part you’re pointing at: tab titles, a notification, an email in the account menu.</p>
<p>Use a solid redaction box for passwords, tokens, card numbers and anything secret. Blur and pixelation are fine for softening a face or a background, but they can sometimes be reversed for short or predictable text, and FrameShot shows that warning in the editor. When you export, all three are flattened into the pixels of the new file, so the hidden content isn’t in what you send.</p>
${fig('redact', 'FrameShot Studio — Editor', 'A billing form in the FrameShot editor with an email address blurred and a card number covered by a solid redaction box', 'Blur for the email, a solid box for the card number.')}
<p>Our <a href="/blog/how-to-blur-or-redact-sensitive-information-in-screenshots">redaction guide</a> goes into the details, including the common mistakes that leave content recoverable.</p>`,
      },
      {
        id: 'faq',
        h: 'Common questions',
        html: `<h3>How do I annotate a screenshot without installing anything?</h3>
<p>On a Mac, click the thumbnail that appears after you take a screenshot and use Markup. On Windows, open the capture in Snipping Tool, which has a pen, a highlighter and cropping. Both are fine for quick marks; a dedicated editor adds numbered steps, editable text and redaction.</p>
<h3>What colour should screenshot annotations be?</h3>
<p>Any colour that doesn’t already appear in the screenshot and stands out against it. Red and orange work on most light interfaces. Whatever you choose, use it consistently.</p>
<h3>How do I add numbered steps to a screenshot?</h3>
<p>Use a step marker tool if your editor has one. In FrameShot, choose the numbered step marker and click each spot in order: the numbers go up by themselves.</p>
<h3>Can I change annotations after saving?</h3>
<p>In FrameShot, yes. The original is kept and your edits autosave separately, so you can reopen the screenshot from the library and move, edit or delete any mark. The exported file is a flat image.</p>
<h3>Is blurring enough to hide text in a screenshot?</h3>
<p>Not for secrets. Blur and pixelation can sometimes be reversed for short text, so use a solid box for anything that must stay private. Everything is edited on your computer; read <a href="/blog/why-frameshot-keeps-your-screenshots-on-your-device">why FrameShot keeps your screenshots on your device</a>.</p>`,
      },
    ],
  },

  'how-to-save-a-web-page-as-a-pdf-or-image': {
    intro: `<p>To save a web page as a PDF in Chrome, press ${k('Ctrl+P')} (${k('Cmd+P')} on a Mac), set the destination to <strong>Save as PDF</strong> and click <strong>Save</strong>. You get a PDF with selectable text, laid out for paper. If you need a PDF or an image that looks exactly like the page on your screen, capture the page as a full-page screenshot and export that instead.</p>
<p>Both are useful, for different jobs. This guide explains how to do each, why printed PDFs often look different from the page, and which image format to choose when you save a page as a picture.</p>`,
    sections: [
      {
        id: 'print-to-pdf',
        h: 'How to save a web page as a PDF in Chrome',
        html: `<ol>
<li><strong>Open the page</strong> and scroll to the bottom once, so images that load as you scroll are already there.</li>
<li><strong>Press ${k('Ctrl+P')}</strong> (${k('Cmd+P')} on a Mac), or open Chrome’s menu and choose <strong>Print</strong>.</li>
<li><strong>Set Destination to Save as PDF.</strong></li>
<li><strong>Choose the layout.</strong> Portrait suits articles; landscape helps with wide tables and dashboards.</li>
<li><strong>Open More settings.</strong> Pick the paper size, margins and scale. Untick <strong>Headers and footers</strong> if you don’t want the date, title, address and page numbers printed on every page, and tick <strong>Background graphics</strong> to keep coloured backgrounds and images that the site sets as backgrounds.</li>
<li><strong>Click Save</strong> and choose where the file goes.</li>
</ol>
<p>The result is a real document: the text can be selected, copied and searched, links usually stay clickable, and the file is often small. That makes it the right choice for articles, documentation and anything you want to read or quote later.</p>`,
      },
      {
        id: 'print-problems',
        h: 'Why doesn’t the PDF look like the web page?',
        html: `<p>Printing doesn’t photograph the page. It asks the website to lay itself out again for paper, and many sites do that very differently:</p>
<ul>
<li><strong>Print styles.</strong> Sites can hide menus, sidebars, buttons and ads when printing, or switch to plain black text. Sometimes that’s helpful; sometimes the part you wanted disappears.</li>
<li><strong>Page breaks.</strong> The page is cut into sheets, often in the middle of a table row, an image or a chart.</li>
<li><strong>Missing images.</strong> Images that only load when you scroll to them may print as blank boxes. Scrolling through the page first usually fixes it.</li>
<li><strong>Missing backgrounds.</strong> Background colours and images are left out unless you tick <strong>Background graphics</strong>.</li>
<li><strong>Web apps.</strong> Pages where only an inner panel scrolls, such as mail and project tools, often print only the visible part or a single page.</li>
<li><strong>Pop-ups.</strong> Cookie banners and chat bubbles can be printed on top of the content. Close them first.</li>
</ul>
<p>If any of these matter, you want an image-based PDF instead.</p>`,
      },
      {
        id: 'image-pdf',
        h: 'How to save a PDF that looks exactly like the screen',
        html: `<p>An image-based PDF is a screenshot inside a PDF file. It looks exactly like the page did, with the same fonts, colours and layout, because it is a picture of the page. With <a href="/">FrameShot</a> it takes a few clicks:</p>
<ol>
<li><strong>Capture the page.</strong> Click the FrameShot icon and choose <strong>Full page</strong>, or press ${k('Alt+Shift+F')} (${k('Option+Shift+F')} on a Mac). FrameShot scrolls the page, loads lazy images, shows sticky headers once and stitches everything into one image. Our <a href="/blog/how-to-take-a-full-page-screenshot-in-chrome">full-page screenshot guide</a> covers tricky pages.</li>
<li><strong>Tidy it up in the editor.</strong> Crop away what you don’t need and redact anything private, such as an address on a receipt.</li>
<li><strong>Export as PDF.</strong> Choose the page size: <strong>A4</strong> or <strong>Letter</strong>, where a long capture continues across as many pages as it needs, or <strong>fit to image</strong>, which gives one long page with no breaks at all.</li>
<li><strong>Choose lossless or compact.</strong> Lossless keeps every pixel exactly; compact uses JPEG compression for a much smaller file.</li>
</ol>
${fig('editor', 'FrameShot Studio — Editor', 'A long web page captured as one image in the FrameShot editor, ready to export as a PDF', 'A full-page capture, ready to export as an image or a PDF.')}
<p>You can set the default page size and margin in FrameShot’s settings. To put several captures into one document, such as a set of order confirmations, select them in the library and export them as one combined PDF.</p>
${callout('Info', '<p>Text in an image-based PDF is part of the picture, so it can’t be selected or searched. If you need both, save a print PDF for the text and an image PDF for the look.</p>')}`,
      },
      {
        id: 'comparison',
        h: 'Print to PDF or image PDF: which is better?',
        html: `<table>
<thead><tr><th></th><th>Chrome Print to PDF</th><th>Image PDF from a capture</th></tr></thead>
<tbody>
<tr><th>Looks like the screen</th><td>Often different</td><td>Exactly</td></tr>
<tr><th>Selectable, searchable text</th><td>Yes</td><td>No</td></tr>
<tr><th>Links</th><td>Usually clickable</td><td>Not clickable</td></tr>
<tr><th>Page breaks</th><td>Always paper-sized sheets</td><td>A4, Letter or one long page</td></tr>
<tr><th>Web apps and inner panels</th><td>Often incomplete</td><td>Main panel captured in full</td></tr>
<tr><th>Annotate and redact first</th><td>No</td><td>Yes</td></tr>
<tr><th>File size</th><td>Usually small</td><td>Larger; compact option helps</td></tr>
<tr><th>Best for</th><td>Articles, docs, reading later</td><td>Receipts, designs, evidence, dashboards</td></tr>
</tbody>
</table>`,
      },
      {
        id: 'image-formats',
        h: 'PNG, JPEG or WebP: how to save a web page as an image',
        html: `<p>Sometimes you don’t need a PDF at all. An image is easier to paste into a chat, a slide or a ticket. FrameShot exports PNG, JPEG and WebP, with a quality setting for JPEG and WebP, and can copy a PNG straight to the clipboard.</p>
<table>
<thead><tr><th>Format</th><th>Strengths</th><th>Weaknesses</th><th>Use it for</th></tr></thead>
<tbody>
<tr><td><strong>PNG</strong></td><td>Lossless, crisp text and lines</td><td>Large files for long pages and photos</td><td>Interface screenshots, documentation, anything with text</td></tr>
<tr><td><strong>JPEG</strong></td><td>Small files, opens everywhere</td><td>Soft or fuzzy edges around text at lower quality</td><td>Photo-heavy pages, email attachments with size limits</td></tr>
<tr><td><strong>WebP</strong></td><td>Smaller than PNG or JPEG at similar quality</td><td>Some older apps and tools can’t open it</td><td>Websites, modern apps, saving storage</td></tr>
</tbody>
</table>
<p>A good default: PNG when the page is mostly text and interface, JPEG when you need a file that anyone can open and size matters, and WebP when you know where it is going. A very long page on a high-resolution screen can be a lot of pixels, so for long captures JPEG, WebP or a compact PDF often keeps the file manageable.</p>`,
      },
      {
        id: 'archiving',
        h: 'Archiving receipts, orders and articles',
        html: `<p>Saving a page once is easy. Finding it again a year later is the hard part. A few habits help:</p>
<ul>
<li><strong>Save on the confirmation page.</strong> Order and booking confirmations are often only shown once. Capture them before you click away.</li>
<li><strong>Name files consistently.</strong> FrameShot builds file names from a template with parts like <code>{domain}</code>, <code>{title}</code> and <code>{date}</code>, and can save into a sub-folder of Downloads, so receipts sort themselves by site and date.</li>
<li><strong>Keep the source.</strong> Every capture in the FrameShot library remembers the page title, address and capture time. Open the details dialog to see them.</li>
<li><strong>Group them.</strong> Put receipts, research or a project’s pages into a collection, then export the whole collection as a ZIP or as one PDF.</li>
<li><strong>For articles, keep the text.</strong> Print to PDF keeps the words searchable. Chrome’s <strong>Save page as</strong> (${k('Ctrl+S')}, or ${k('Cmd+S')} on a Mac) can also save the page itself; on recent versions the <strong>Webpage, Single File</strong> option keeps it in one file.</li>
<li><strong>Back up what matters.</strong> Copy important PDFs to wherever you keep documents, such as your own cloud drive.</li>
</ul>
<p>Receipts and order pages often include your address, phone number and part of a card number. FrameShot keeps captures in your browser on your computer and uploads nothing, as explained in our <a href="/privacy">privacy policy</a>. If you share a receipt with someone else, <a href="/blog/how-to-blur-or-redact-sensitive-information-in-screenshots">redact it first</a>.</p>`,
      },
      {
        id: 'faq',
        h: 'Common questions',
        html: `<h3>How do I save a whole web page as one PDF page without breaks?</h3>
<p>Chrome’s print dialog always splits the page into paper-sized sheets. Capture a full-page screenshot instead and export it as a PDF with the page size set to fit the image, which gives one long page.</p>
<h3>Why are images missing from my saved PDF?</h3>
<p>Many sites load images only when you scroll to them. Scroll to the bottom of the page before printing, and tick <strong>Background graphics</strong> in More settings for images set as backgrounds.</p>
<h3>Can I search the text in a PDF made from a screenshot?</h3>
<p>No. The text is part of the image. Use Chrome’s Print to PDF when you need selectable, searchable text.</p>
<h3>How do I save a web page as a JPEG or PNG?</h3>
<p>Take a full-page screenshot, then export it in the format you need. In FrameShot, choose PNG, JPEG or WebP when you download. For a single section, see <a href="/blog/how-to-screenshot-part-of-a-web-page">how to screenshot part of a web page</a>, and for very long pages, our guide to <a href="/blog/how-to-take-a-scrolling-screenshot">scrolling screenshots</a>.</p>
<h3>Should I choose A4 or Letter?</h3>
<p>Letter is the standard paper size in the US and Canada; A4 is standard almost everywhere else. Pick the one your printer and the people you send it to use. If the PDF will only be read on screen, fit to image avoids page breaks altogether.</p>`,
      },
    ],
  },

  'how-to-record-a-video-tutorial-with-your-webcam': {
    intro: `<p>To record your screen and webcam together, use a screen recorder that adds your camera as a small bubble over the screen, switch on your microphone, choose the tab, window or screen you are demonstrating, and press record. In Chrome you can do all of that without installing desktop software. A good tutorial video, though, is mostly decided before you press record: a clear goal, a short script and a tidy screen.</p>
<p>This guide covers the whole process, from planning and setting up your microphone and camera to recording, choosing quality settings and exporting an MP4, plus a GIF of the key moment.</p>`,
    sections: [
      {
        id: 'plan',
        h: 'How do you plan a tutorial video?',
        html: `<p>Start with one sentence: “After this video, the viewer can…”. For example, “…export a report as a PDF” or “…invite a teammate to a project”. If the sentence needs an “and”, you probably have two videos.</p>
<ul>
<li><strong>Know your viewer.</strong> A first-time user needs every click; a colleague who knows the tool needs only the new part.</li>
<li><strong>Start from where they are.</strong> Begin on the screen the viewer will see when they start, not on your own customised setup.</li>
<li><strong>Prepare the example.</strong> Have the demo account, sample file or test data ready, so you don’t search for them while recording.</li>
<li><strong>List the steps</strong> in order, with the exact names of the buttons and menus you will click.</li>
</ul>`,
      },
      {
        id: 'script',
        h: 'Write a short script or outline',
        html: `<p>You don’t need a word-for-word script, but you do need more than “I’ll wing it”. A bullet outline you can glance at keeps you from rambling and from forgetting a step. A simple structure that works for most tutorials:</p>
<ol>
<li><strong>The goal, in one sentence:</strong> “In this video I’ll show you how to export a report as a PDF.”</li>
<li><strong>Where to start:</strong> “Open the Reports page from the left menu.”</li>
<li><strong>The steps,</strong> one per line, saying what you click and why.</li>
<li><strong>The result:</strong> show the finished thing on screen for a moment.</li>
<li><strong>One tip or common mistake,</strong> if there is one worth mentioning.</li>
</ol>
<p>Read it aloud once with a timer running. If it is much longer than you expected, cut words, not steps. Say what you are doing as you do it, and pause briefly after each click so viewers can follow.</p>`,
      },
      {
        id: 'setup',
        h: 'Set up your microphone, camera and screen',
        html: `<p><strong>Sound matters most.</strong> Viewers forgive a soft picture far more readily than muffled or echoing speech.</p>
<ul>
<li>Use a headset or a microphone close to your mouth, in the quietest room you have. Soft furnishings reduce echo.</li>
<li>Wear headphones if you also record your computer’s sound, so your microphone doesn’t pick up your speakers.</li>
<li>Light your face from the front, for example with a window or a lamp behind the screen, not behind you.</li>
<li>Put the camera roughly at eye level and look at it when you introduce yourself.</li>
</ul>
<p><strong>Then tidy the screen.</strong></p>
<ul>
<li>Close tabs and apps you don’t need, and hide Chrome’s bookmarks bar with ${k('Ctrl+Shift+B')} (${k('Cmd+Shift+B')} on a Mac).</li>
<li>Turn on Do Not Disturb so notifications and message previews don’t appear.</li>
<li>Zoom the page in a little with ${k('Ctrl++')} (${k('Cmd++')} on a Mac) so text is readable on a phone or a small player.</li>
<li>Use demo data, not real customers. Our <a href="/blog/how-to-blur-or-redact-sensitive-information-in-screenshots">redaction guide</a> explains why fixing privacy problems in a video afterwards is so much harder than in a screenshot.</li>
</ul>`,
      },
      {
        id: 'what-to-share',
        h: 'Should you record a tab, a window or the whole screen?',
        html: `<p>Chrome asks what to share when the recording starts. For a tutorial, the choice affects both what viewers see and what sound you can record:</p>
<table>
<thead><tr><th>You share</th><th>Good for</th><th>Sound you can record</th></tr></thead>
<tbody>
<tr><td><strong>A Chrome tab</strong></td><td>Web app tutorials: only the page is shown, no notifications or other apps</td><td>The tab’s sound, on every system, plus your microphone</td></tr>
<tr><td><strong>A window</strong></td><td>One desktop app</td><td>Your microphone only: Chrome never shares a window’s sound</td></tr>
<tr><td><strong>Entire screen</strong></td><td>Tutorials that move between several apps</td><td>Your computer’s sound on Windows and ChromeOS, and on macOS 14.2 or later with Chrome 141 or later, plus your microphone</td></tr>
</tbody>
</table>
<p>For most web tutorials, a tab is the cleanest choice. If you need to go to another page during the tutorial, simply follow a link in the shared tab. Chrome’s sharing bar also lets you switch the recording to a different tab without stopping. The details of sound in each case are in <a href="/blog/how-to-record-your-screen-with-audio-in-chrome">how to record your screen with audio in Chrome</a>, and if you record desktop apps, see our guides for <a href="/blog/how-to-screen-record-on-windows">Windows</a> and <a href="/blog/how-to-screen-record-on-a-mac-with-sound">Mac</a>.</p>`,
      },
      {
        id: 'record',
        h: 'How to record your screen and webcam in Chrome',
        html: `<p>Here is how it works with <a href="/">FrameShot’s screen recorder for Chrome</a>:</p>
<ol>
<li><strong>Click the FrameShot icon and choose Record screen.</strong> The recorder opens in a FrameShot tab. Keep that tab open until you finish.</li>
<li><strong>Switch on the microphone.</strong> Chrome asks for permission the first time. Pick the right microphone if you have several, then speak and watch the level meter move.</li>
<li><strong>Switch on the camera.</strong> Your face appears in a round bubble. Choose the corner and one of three sizes, so it won’t cover the part of the screen you will be talking about.</li>
<li><strong>Turn on tab or system sound</strong> if the tutorial includes sound from the page.</li>
<li><strong>Choose quality and a countdown.</strong> 1080p at 30 frames per second suits most tutorials. A 3, 5 or 10 second countdown gives you time to get to the right page.</li>
<li><strong>Click Start recording,</strong> choose the tab, window or screen in Chrome’s dialog, check the sound checkbox and click <strong>Share</strong>.</li>
<li><strong>Record.</strong> Pause when you need to set up the next step or lose your place, and resume when you’re ready: the pauses are left out of the video. You can mute the microphone, and move or resize the camera bubble, while recording.</li>
<li><strong>Stop</strong> from the recorder, the FrameShot popup or Chrome’s <strong>Stop sharing</strong> bar. The video opens in the player.</li>
</ol>
${fig('recorder', 'FrameShot Studio — Recorder', 'The FrameShot recorder with a tab selected, the microphone level meter active and a round webcam bubble preview in the corner', 'Check the microphone meter and the camera bubble before you start.')}
<p>The camera bubble is drawn into the video itself, so there is no separate camera file to line up later. Recordings are saved in small pieces as you go, so if Chrome or your computer crashes, reopen FrameShot and it offers to recover the recording.</p>`,
      },
      {
        id: 'quality',
        h: 'Which quality and frame rate should you choose?',
        html: `<p>FrameShot records at 720p, 1080p, 1440p or 4K, at 15, 30 or 60 frames per second. Higher settings look sharper and smoother but make bigger files.</p>
<table>
<thead><tr><th>Tutorial type</th><th>Suggested setting</th></tr></thead>
<tbody>
<tr><td>Most web app and software tutorials</td><td>1080p, 30 fps</td></tr>
<tr><td>Code, spreadsheets or small text on a large monitor</td><td>1440p or 4K, 30 fps</td></tr>
<tr><td>Fast scrolling, animation or games</td><td>1080p, 60 fps</td></tr>
<tr><td>Long walkthroughs with little motion</td><td>1080p or 720p, 15 fps</td></tr>
</tbody>
</table>
<p>Recordings are saved as MP4 when Chrome can record it, and as WebM otherwise. FrameShot sets no time limit; the length is limited only by the storage space Chrome can use on your computer.</p>`,
      },
      {
        id: 'keep-it-short',
        h: 'Keep it short: record in parts',
        html: `<p>The tutorials people actually finish are usually short and about one task. A few ways to keep yours tight:</p>
<ul>
<li><strong>Use pause instead of cutting.</strong> Pause while a page loads, while you find the next file or when you lose your train of thought. Paused time doesn’t end up in the video.</li>
<li><strong>Split long topics</strong> into several short videos, one per task, rather than one long recording.</li>
<li><strong>Retake rather than patch.</strong> If a take goes wrong early, discard it and start again. Discarding deletes all of the recorded data.</li>
<li><strong>Skip the long intro.</strong> Say what the video shows in one sentence and start.</li>
</ul>
${callout('Info', '<p>FrameShot doesn’t edit or trim videos. You can choose a range only when you export a GIF. If you need to cut out sections, add titles or join clips, download the MP4 and open it in a video editor.</p>')}`,
      },
      {
        id: 'export',
        h: 'Export the MP4 and make a GIF of the key moment',
        html: `<p>When you stop, the recording opens in FrameShot’s player and is saved in your library on your computer. From there:</p>
<ul>
<li><strong>Download</strong> the video as MP4 (or WebM) and share it however you like: upload it to your video platform, attach it to a help article or drop it into your team chat. FrameShot never uploads it for you.</li>
<li><strong>Rename</strong> it so you can find it later, and mark it as a favourite if it’s one you’ll reuse.</li>
<li><strong>Save frame</strong> turns the current moment into a screenshot that opens in the editor, useful for a thumbnail or for a written version of the tutorial.</li>
<li><strong>Export GIF</strong> turns a short part, up to 60 seconds, into a looping GIF for docs, tickets or a README. Pick the width and frame rate to keep it light.</li>
</ul>
${fig('gif', 'FrameShot Studio — Player', 'The Export as GIF dialog over a tutorial recording, showing the selected range, width and frame rate options', 'Turn the most important ten seconds into a GIF that plays by itself.')}
<p>Our guide on <a href="/blog/how-to-turn-a-screen-recording-into-a-gif">turning a screen recording into a GIF</a> explains which size and frame rate keep GIFs sharp and small.</p>`,
      },
      {
        id: 'faq',
        h: 'Common questions',
        html: `<h3>How do I record my screen and webcam at the same time?</h3>
<p>Use a screen recorder with a webcam overlay. In FrameShot, switch on the camera in the recorder before you start: your face appears in a round bubble in the corner of the screen recording, in one video file.</p>
<h3>How long should a tutorial video be?</h3>
<p>As short as the task allows. Cover one task per video, skip the long introduction and stop once the result is on screen. If it runs long, split it into parts.</p>
<h3>Can I trim the video in FrameShot?</h3>
<p>No. FrameShot records, plays and downloads videos but doesn’t edit them. The only trimming is when you export part of a recording as a GIF. Use pause while recording to leave out the parts you don’t need.</p>
<h3>Why can’t viewers hear the sound from my screen?</h3>
<p>Chrome shares sound only when you allow it in its dialog, and never for a single window. Share a tab with <strong>Also share tab audio</strong> on, or your entire screen with <strong>Also share system audio</strong> ticked, where your system supports it.</p>
<h3>Where is my recording saved?</h3>
<p>In FrameShot’s library, in your browser on your computer. Nothing is uploaded. Download it to get an MP4 or WebM file in your Downloads folder. Still choosing a recorder? See <a href="/blog/how-to-choose-a-screen-recorder-extension-for-chrome">what to check in a screen recorder extension</a>.</p>`,
      },
    ],
  },

  'how-to-choose-a-screen-recorder-extension-for-chrome': {
    intro: `<p>Before you install a screen recorder extension for Chrome, check ten things: whether it adds a watermark, whether it limits recording length, whether it needs an account, where your recordings are stored, which permissions it asks for, which sound it can record, whether it supports a webcam, which file formats it saves, whether it can recover a recording after a crash, and what its privacy policy says. Most of these take a minute to check on the store listing or in <code>chrome://extensions</code>.</p>
<p>This guide explains what to look for in each case and what the warning signs are. At the end, we hold <a href="/">FrameShot</a> to the same checklist, including where it falls short.</p>`,
    sections: [
      {
        id: 'checklist',
        h: 'What to check in a screen recorder extension',
        html: `<table>
<thead><tr><th>Check</th><th>What to look for</th></tr></thead>
<tbody>
<tr><td><strong>Watermark</strong></td><td>None, or a clear statement of when one is added</td></tr>
<tr><td><strong>Time limits</strong></td><td>No cap on recording length, or a cap you can live with</td></tr>
<tr><td><strong>Sign-up</strong></td><td>Whether you can record before creating an account</td></tr>
<tr><td><strong>Storage</strong></td><td>Saved on your computer, or uploaded to a server</td></tr>
<tr><td><strong>Permissions</strong></td><td>Only what recording needs; no access to all websites without a reason</td></tr>
<tr><td><strong>Sound</strong></td><td>Microphone, tab sound and system sound</td></tr>
<tr><td><strong>Webcam</strong></td><td>A camera overlay you can position</td></tr>
<tr><td><strong>Formats</strong></td><td>MP4 for sharing, WebM as a fallback, GIF for short clips</td></tr>
<tr><td><strong>Crash recovery</strong></td><td>Recordings saved while you record, not only at the end</td></tr>
<tr><td><strong>Offline use</strong></td><td>Recording works without an internet connection</td></tr>
<tr><td><strong>Privacy policy</strong></td><td>Plain language about what is collected and sent</td></tr>
</tbody>
</table>`,
      },
      {
        id: 'limits',
        h: 'Watermarks, time limits and sign-ups',
        html: `<p>These are the three most common surprises, and the store listing doesn’t always mention them up front.</p>
<ul>
<li><strong>Watermarks.</strong> Some recorders stamp a logo on every video unless you pay. Look for an explicit “no watermark” statement, and check a first test recording before you rely on it.</li>
<li><strong>Time limits.</strong> A cap of a few minutes is fine for bug reports and useless for lessons or meetings. Check whether the limit applies per recording, per month or only to certain features.</li>
<li><strong>Sign-ups.</strong> An account isn’t bad in itself; it is needed for share links and cloud storage. But if you only want a video file on your computer, a recorder that makes you sign in first is collecting data it doesn’t need.</li>
</ul>
<p>The quickest test is to install the extension, record 30 seconds and download the file. If you hit a login screen, a paywall or a logo along the way, you know.</p>`,
      },
      {
        id: 'storage',
        h: 'Where do your recordings go?',
        html: `<p>Screen recordings show whatever was on your screen: emails, chats, customer records, your face and your voice. Where they are stored matters more than most features.</p>
<ul>
<li><strong>Cloud recorders</strong> upload the video so they can give you a share link. That is convenient, but the copy now lives on someone else’s server, under their security and their retention rules.</li>
<li><strong>Local recorders</strong> keep the video in your browser or save it to your computer. Sharing means downloading and sending the file yourself, but nothing leaves your device by accident.</li>
<li><strong>Offline use</strong> is a simple test of which kind you have: turn off Wi-Fi and try to record and download. A local recorder works the same; one that depends on a server won’t.</li>
<li><strong>The privacy policy</strong> should say, in plain words, what is sent, when, and whether you can turn it off. Vague phrases like “we may collect information to improve our services” deserve a closer look.</li>
</ul>
<p>Our article on <a href="/blog/why-frameshot-keeps-your-screenshots-on-your-device">why FrameShot keeps your files on your device</a> explains how a recorder can work without a server at all.</p>`,
      },
      {
        id: 'permissions',
        h: 'Which permissions does a screen recorder need?',
        html: `<p>Less than you might think. Chrome lets any web page ask to share your screen through its own picker, so recording the screen doesn’t require a special extension permission. The microphone and camera are covered by Chrome’s usual prompts, which appear when they are first used. What to watch for:</p>
<ul>
<li><strong>Access to all websites.</strong> Chrome shows this as “Read and change all your data on all websites”. It lets an extension read every page you open, at any time. A recorder rarely needs it, so look for a reason in the listing.</li>
<li><strong>Browsing history, tabs and other extensions.</strong> Permissions that read your history or manage your other extensions have nothing to do with recording.</li>
<li><strong>Downloads and storage.</strong> These are normal: they let the extension save files and keep your recordings.</li>
</ul>
<p><strong>How to check an extension’s permissions:</strong></p>
<ol>
<li>Open <code>chrome://extensions</code> in the address bar.</li>
<li>Find the extension and click <strong>Details</strong>.</li>
<li>Read the <strong>Permissions</strong> list. If the extension asks for access to websites, a <strong>Site access</strong> section shows it, and on recent versions of Chrome you can limit it to when you click the extension or to specific sites.</li>
<li>Before installing, read the permissions Chrome lists in the install dialog and the privacy section of the store listing.</li>
</ol>
${callout('ShieldCheck', '<p>A good rule: every permission should match a feature you can see. If you can’t think why a recorder would need something, don’t install it until the listing explains.</p>')}`,
      },
      {
        id: 'features',
        h: 'Sound, webcam and file formats',
        html: `<p><strong>Sound.</strong> Check which sources the recorder can capture and whether it mixes them. In Chrome, a shared tab’s sound can be recorded on every system, whole-screen sound depends on your system (Windows and ChromeOS, and recent macOS with recent Chrome), and a single window never has sound. That is Chrome’s rule, not the extension’s. A good recorder tells you this before you start rather than after a silent take. See <a href="/blog/how-to-record-your-screen-with-audio-in-chrome">how to record your screen with audio in Chrome</a>.</p>
<p><strong>Webcam.</strong> If you record tutorials or demos, look for a camera overlay you can move and resize, and check whether it is part of the video or saved separately. Our guide to <a href="/blog/how-to-record-a-video-tutorial-with-your-webcam">recording your screen and webcam for a tutorial</a> shows what a good setup looks like.</p>
<p><strong>Formats.</strong></p>
<table>
<thead><tr><th>Format</th><th>Why it matters</th></tr></thead>
<tbody>
<tr><td><strong>MP4</strong></td><td>Plays almost everywhere: phones, presentation apps, video sites and email attachments</td></tr>
<tr><td><strong>WebM</strong></td><td>Plays in browsers; some desktop apps and editors don’t open it</td></tr>
<tr><td><strong>GIF</strong></td><td>Short silent clips that loop in chats, tickets and docs</td></tr>
</tbody>
</table>
<p>Also check the quality options: a recorder that tops out at a low resolution makes code and small text hard to read.</p>`,
      },
      {
        id: 'reliability',
        h: 'Crash recovery and long recordings',
        html: `<p>Nothing hurts like losing a 40-minute recording because the browser crashed at minute 39. Ask two questions:</p>
<ul>
<li><strong>Is the recording saved while you record?</strong> Recorders that keep the whole video in memory until you stop lose everything in a crash. Ones that save small pieces as they go can recover almost all of it.</li>
<li><strong>What happens if a tab is closed?</strong> In Chrome, screen recording needs a page to run in. Find out which tab that is, and whether the recorder warns you before it closes.</li>
</ul>
<p>Pause and resume matter here too. Being able to pause instead of stopping means fewer files and fewer chances to lose one.</p>`,
      },
      {
        id: 'red-flags',
        h: 'Red flags to watch for',
        html: `<ul>
<li>Access to all websites with no explanation of why a recorder needs it.</li>
<li>Permissions for history, cookies or managing other extensions.</li>
<li>No privacy policy, or one that doesn’t mention recordings at all.</li>
<li>Recordings uploaded by default, with no option to keep them local.</li>
<li>An account required before the first recording, when you only need a file.</li>
<li>Features that suddenly need payment after you’ve recorded something, such as downloading without a watermark.</li>
<li>Recent reviews mentioning new ads, redirects or changes after an update.</li>
<li>A listing full of claims but vague on what the free version actually does.</li>
</ul>`,
      },
      {
        id: 'frameshot',
        h: 'How FrameShot measures up',
        html: `<p>Here is FrameShot against the same checklist, including the trade-offs:</p>
<table>
<thead><tr><th>Check</th><th>FrameShot</th></tr></thead>
<tbody>
<tr><td>Watermark</td><td>Never added</td></tr>
<tr><td>Time limits</td><td>None set by FrameShot; your disk space and Chrome’s storage still apply</td></tr>
<tr><td>Sign-up</td><td>No account, no paid plan, nothing locked</td></tr>
<tr><td>Storage</td><td>In your browser on your computer, not synced; nothing is uploaded</td></tr>
<tr><td>Permissions</td><td><code>activeTab</code>, <code>scripting</code>, <code>storage</code>, <code>unlimitedStorage</code>, <code>downloads</code>, <code>contextMenus</code>, <code>offscreen</code>; no access to websites in advance. Recording added no permissions</td></tr>
<tr><td>Sound</td><td>Microphone plus tab sound, and system sound where Chrome offers it, mixed into one track; a warning if no sound comes in</td></tr>
<tr><td>Webcam</td><td>Round bubble drawn into the video, any corner, three sizes, adjustable while recording</td></tr>
<tr><td>Formats</td><td>MP4 (H.264) on Chrome 126 or later where Chrome can encode it, otherwise WebM; GIF export from any part of a recording</td></tr>
<tr><td>Quality</td><td>720p to 4K, at 15, 30 or 60 fps</td></tr>
<tr><td>Crash recovery</td><td>Saved in small pieces while recording; an interrupted recording can be recovered, minus the last few seconds</td></tr>
<tr><td>Offline use</td><td>Works fully offline</td></tr>
<tr><td>What it sends</td><td>An anonymous install count: a random ID, the version, your operating system and browser language on install, update and removal. Turn it off in <strong>Settings → Privacy</strong></td></tr>
</tbody>
</table>
<p>The honest limits: there are no share links or cloud sync, so you share by downloading the file. FrameShot doesn’t edit or trim videos, except choosing a range when you export a GIF. The recorder runs in a FrameShot tab that must stay open while you record. The full details are in the <a href="/privacy">privacy policy</a>.</p>
<p>FrameShot is also a screenshot tool, with <a href="/blog/how-to-take-a-full-page-screenshot-in-chrome">full-page capture</a> and an editor, so screenshots and recordings share one library.</p>`,
      },
      {
        id: 'faq',
        h: 'Common questions',
        html: `<h3>Do screen recorder extensions need access to all my websites?</h3>
<p>Usually not. Chrome’s own share picker lets you choose a tab, window or screen to record without any website access. Ask why before installing a recorder that wants to read and change data on every site.</p>
<h3>Is it safe to use a screen recorder extension?</h3>
<p>It can be. Check the permissions in <code>chrome://extensions</code>, read the privacy policy, and prefer a recorder that keeps files on your computer and works offline. Chrome always shows when your screen is being shared.</p>
<h3>Can a Chrome extension record system audio?</h3>
<p>When you share your entire screen, Chrome can include system sound on Windows and ChromeOS, and on recent macOS with recent Chrome. Tab sound works on every system. A single window never includes sound.</p>
<h3>Can I record my screen in Chrome without an extension?</h3>
<p>Your operating system may have a recorder built in. See our guides for <a href="/blog/how-to-screen-record-on-windows">Windows</a> and <a href="/blog/how-to-screen-record-on-a-mac-with-sound">Mac</a>. An extension adds things like tab sound, a webcam bubble and recording inside the browser.</p>
<h3>Why do some screen recorders save WebM instead of MP4?</h3>
<p>WebM is the format Chrome has long been able to record. MP4 recording needs a recent version of Chrome and a suitable encoder. MP4 is easier to share, so a recorder that picks it when possible saves you a conversion. For short clips, see <a href="/blog/how-to-turn-a-screen-recording-into-a-gif">how to turn a recording into a GIF</a>.</p>`,
      },
    ],
  },
};
