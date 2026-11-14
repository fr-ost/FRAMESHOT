/** Newer guides, part A (2026-11-14). Every FrameShot fact here matches FEATURES.md and the README. */
import { icon, windowFrame } from '../layout.mjs';

const k = (keys) => keys.split('+').map((x) => `<kbd>${x}</kbd>`).join('+');
const callout = (ic, html) => `<div class="callout">${icon(ic, 20)}<div>${html}</div></div>`;
const fig = (name, title, alt, caption, dark) =>
  `<figure>${windowFrame(name, { title, alt, sizes: '(max-width: 780px) 92vw, 740px', dark })}<figcaption>${caption}</figcaption></figure>`;

export const META_A = [
  {
    slug: 'how-to-take-a-screenshot-in-chrome',
    title: 'How to Screenshot in Chrome on Windows, Mac and Chromebook',
    description: 'How to screenshot in Chrome on Windows, Mac, ChromeOS and Linux: keyboard shortcuts, the hidden DevTools commands, and full-page, area and element captures.',
    tag: 'Guide',
    image: 'editor',
    alt: 'A screenshot of a web page taken in Chrome and opened in the FrameShot editor with arrows and a note',
    date: '2026-11-14',
    keywords: ['how to screenshot in chrome', 'screenshot in chrome', 'chrome screenshot shortcut', 'take a screenshot in google chrome', 'devtools capture screenshot', 'screenshot a web page', 'chrome screenshot extension'],
  },
  {
    slug: 'how-to-screenshot-on-a-chromebook',
    title: 'How to Screenshot on a Chromebook: Shortcuts and Tools',
    description: 'How to screenshot on a Chromebook with keyboard shortcuts, the Screen capture tool or tablet buttons, where files are saved, and how to capture a full page.',
    tag: 'Guide',
    image: 'library-light',
    alt: 'Screenshots taken on a Chromebook, organised in the FrameShot library',
    date: '2026-11-14',
    keywords: ['how to screenshot on chromebook', 'chromebook screenshot shortcut', 'screenshot on chromebook', 'where do screenshots go on chromebook', 'chromebook partial screenshot', 'chromebook screen capture', 'full page screenshot chromebook'],
  },
  {
    slug: 'how-to-screen-record-on-windows',
    title: 'How to Screen Record on Windows 11 (4 Simple Ways)',
    description: 'How to screen record on Windows 11 with Snipping Tool, Xbox Game Bar, PowerPoint or a Chrome extension, with sound, mic and webcam, and which to pick.',
    tag: 'Recording',
    image: 'recorder',
    alt: 'The FrameShot screen recorder in Chrome on Windows, with the microphone, system sound and a camera bubble switched on',
    date: '2026-11-14',
    keywords: ['how to screen record on windows 11', 'screen record windows', 'snipping tool screen recording', 'xbox game bar record screen', 'screen record windows with audio', 'record screen in chrome on windows', 'windows screen recorder'],
  },
  {
    slug: 'how-to-screen-record-on-a-mac-with-sound',
    title: 'How to Screen Record on a Mac With Sound',
    description: 'How to screen record on Mac with sound: record your voice with Cmd+Shift+5 or QuickTime, and a Chrome tab’s or your Mac’s own audio with an extension.',
    tag: 'Recording',
    image: 'library-dark',
    alt: 'A screen recording with sound saved next to screenshots in the FrameShot library, in dark mode',
    date: '2026-11-14',
    keywords: ['how to screen record on mac with sound', 'screen record mac with audio', 'mac screen recording no sound', 'record internal audio mac', 'quicktime screen recording with sound', 'cmd shift 5 audio', 'record chrome tab with sound mac'],
  },
  {
    slug: 'how-to-take-a-scrolling-screenshot',
    title: 'How to Take a Scrolling Screenshot on Windows and Mac',
    description: 'A scrolling screenshot captures more than fits on screen. Why Windows and Mac lack one, and how to capture long pages, chats and scrolling panels in Chrome.',
    tag: 'Tips',
    image: 'editor',
    alt: 'A long scrolling screenshot of a web page stitched into one image in the FrameShot editor',
    date: '2026-11-14',
    keywords: ['scrolling screenshot', 'how to take a scrolling screenshot', 'scrolling screenshot windows', 'scrolling screenshot mac', 'scrolling screenshot chrome', 'screenshot a scrolling window', 'long screenshot'],
  },
];

export const BODIES_A = {
  'how-to-take-a-screenshot-in-chrome': {
    intro: `<p>To take a screenshot in Chrome, use your computer’s own shortcut: ${k('Win+Shift+S')} on Windows, ${k('Cmd+Shift+4')} on a Mac, or ${k('Ctrl+Show windows')} on a Chromebook. Chrome also has hidden screenshot commands in its developer tools, and an extension can capture a whole page, a dragged area or a single element in one click.</p>
<p>This guide walks through every option on Windows, macOS, ChromeOS and Linux, explains what each one can and can’t capture, and ends with a table so you can pick the right one in a few seconds.</p>`,
    sections: [
      {
        id: 'windows',
        h: 'How to screenshot in Chrome on Windows',
        html: `<p>Chrome doesn’t have its own screenshot button, so on Windows you use the shortcuts built into the system. They work in Chrome and in every other app.</p>
<ul>
<li><strong>${k('Win+Shift+S')}</strong> opens the Snipping Tool bar at the top of the screen. Choose a rectangle, a window, the full screen or a freehand shape. The capture is copied to the clipboard, and a notification lets you open it in Snipping Tool to draw on it and save it.</li>
<li><strong>${k('PrtScn')}</strong> copies the whole screen to the clipboard. On recent versions of Windows 11 it opens the Snipping Tool bar instead; you can change that under <strong>Settings → Accessibility → Keyboard</strong>.</li>
<li><strong>${k('Win+PrtScn')}</strong> saves the whole screen straight away as a PNG file in <strong>Pictures → Screenshots</strong>. The screen dims for a moment to show it worked.</li>
<li><strong>${k('Alt+PrtScn')}</strong> copies only the active window, which is handy when Chrome isn’t full screen.</li>
</ul>
<p>On laptops where Print Screen shares a key with something else, you may need to hold the ${k('Fn')} key as well.</p>`,
      },
      {
        id: 'mac',
        h: 'How to screenshot in Chrome on a Mac',
        html: `<p>macOS has four shortcuts, and they all work in Chrome:</p>
<ul>
<li><strong>${k('Cmd+Shift+3')}</strong> captures the entire screen.</li>
<li><strong>${k('Cmd+Shift+4')}</strong> turns the pointer into a crosshair. Drag to capture an area.</li>
<li><strong>${k('Cmd+Shift+4')}, then ${k('Space')}</strong> switches to a camera icon. Click the Chrome window to capture just that window.</li>
<li><strong>${k('Cmd+Shift+5')}</strong> opens the screenshot toolbar, with buttons for the whole screen, a window or a selected portion, plus a timer and a choice of where to save.</li>
</ul>
<p>Screenshots are saved to the desktop by default. Add ${k('Control')} to any of the shortcuts, for example ${k('Cmd+Control+Shift+4')}, to copy the screenshot to the clipboard instead of saving a file. After a capture, a small thumbnail appears in the corner of the screen; click it to crop or mark it up before it’s saved.</p>`,
      },
      {
        id: 'chromebook-linux',
        h: 'Chromebook and Linux shortcuts',
        html: `<p>On a <strong>Chromebook</strong>, press ${k('Ctrl+Show windows')} for the whole screen and ${k('Ctrl+Shift+Show windows')} to choose part of it. The Show windows key is the one in the top row that looks like a rectangle with two lines beside it. Screenshots go to your Downloads folder and are copied to the clipboard. There’s more detail, including tablets and keyboards without that key, in our guide on <a href="/blog/how-to-screenshot-on-a-chromebook">how to screenshot on a Chromebook</a>.</p>
<p>On <strong>Linux</strong>, it depends on your desktop. Most desktops use the ${k('PrtScn')} key. On recent versions of GNOME, it opens a screenshot tool where you choose the screen, a window or an area, and the image is saved in <strong>Pictures → Screenshots</strong>. Other desktops have their own screenshot app with similar options; look for “Screenshot” in your app menu.</p>`,
      },
      {
        id: 'devtools',
        h: 'Chrome’s hidden screenshot commands in DevTools',
        html: `<p>If you want a screenshot of the web page only, without the address bar, the tabs or the rest of your screen, Chrome has four built-in commands. They’re part of the developer tools, but you don’t need to be a developer to use them:</p>
<ol>
<li>Open DevTools with ${k('F12')}, or ${k('Ctrl+Shift+I')} (${k('Cmd+Option+I')} on a Mac).</li>
<li>Open the Command Menu with ${k('Ctrl+Shift+P')} (${k('Cmd+Shift+P')} on a Mac).</li>
<li>Type <code>screenshot</code> and pick one of the commands below.</li>
</ol>
<table>
<thead><tr><th>Command</th><th>What it captures</th></tr></thead>
<tbody>
<tr><td><strong>Capture screenshot</strong></td><td>The part of the page you can see right now</td></tr>
<tr><td><strong>Capture full size screenshot</strong></td><td>The whole page, from top to bottom</td></tr>
<tr><td><strong>Capture area screenshot</strong></td><td>An area you drag over the page</td></tr>
<tr><td><strong>Capture node screenshot</strong></td><td>The element currently selected in the Elements panel</td></tr>
</tbody>
</table>
<p>Each command saves a PNG file to your Downloads folder. For a node screenshot, first right-click the part of the page you want, choose <strong>Inspect</strong> so it’s selected in the Elements panel, then run the command. To see how a page looks on a phone, turn on the device toolbar with ${k('Ctrl+Shift+M')} (${k('Cmd+Shift+M')} on a Mac) before you capture.</p>
<p>The commands are quick, but they have limits. The full-size capture works by pretending the window is as tall as the page, so pages that scroll inside a panel often come out as just the visible part, sticky headers can land in odd places, and images that load as you scroll may be missing. There’s also no way to mark up or blur the result.</p>`,
      },
      {
        id: 'extension',
        h: 'Full page, area and element screenshots with an extension',
        html: `<p>A screenshot extension adds the things the system shortcuts can’t do: capturing a page that’s longer than the screen, an area that keeps going below the fold, or one exact element. <a href="/">FrameShot, our screenshot and screen recording extension for Chrome</a>, gives you five capture modes from its toolbar icon, the right-click menu or a shortcut:</p>
<ul>
<li><strong>Visible area</strong> (${k('Alt+Shift+V')}): what’s on screen, with the scrollbars trimmed. An optional 3, 5 or 10 second delay gives you time to open a menu or hover over a button first.</li>
<li><strong>Full page</strong> (${k('Alt+Shift+F')}): scrolls the page, captures every part and joins them into one image. Sticky headers appear once and lazy images load first.</li>
<li><strong>Selected area</strong> (${k('Alt+Shift+A')}): drag a box. Scroll while selecting to make it taller than the screen.</li>
<li><strong>Element</strong> (${k('Alt+Shift+E')}): hover to highlight a block such as a table, a card or a comment, press ${k('↑')} or ${k('↓')} to step to the larger or smaller block, and click to capture it exactly to its edges.</li>
<li><strong>Scrolling panel</strong>: captures everything inside an inner area that scrolls on its own, such as a chat or a side panel.</li>
</ul>
<p>On a Mac, the shortcuts use ${k('Option')} in place of ${k('Alt')}. Chrome only assigns them when they don’t clash with another extension, and you can change them at <code>chrome://extensions/shortcuts</code>.</p>
<ol>
<li><strong>Add FrameShot to Chrome</strong> and pin it: click the puzzle icon in the toolbar, then the pin next to FrameShot.</li>
<li><strong>Open the page</strong> you want to capture.</li>
<li><strong>Click the FrameShot icon</strong> and choose a mode, or press its shortcut.</li>
<li><strong>Edit the screenshot.</strong> It opens in the editor, where you can crop, add arrows, text and numbered steps, and blur anything private.</li>
<li><strong>Export</strong> it as PNG, JPEG, WebP or PDF, or copy it to the clipboard and paste it into an email or a chat.</li>
</ol>
${fig('editor', 'FrameShot Studio — Editor', 'A captured web page in the FrameShot editor with an arrow, numbered step markers and a text note', 'Every capture opens in the editor, ready to crop and annotate.')}
<p>The full-page mode has its own tricks for sticky headers, endless feeds and very long pages, covered step by step in <a href="/blog/how-to-take-a-full-page-screenshot-in-chrome">how to take a full-page screenshot in Chrome</a>. If you only need a section, see <a href="/blog/how-to-screenshot-part-of-a-web-page">how to screenshot part of a web page</a>.</p>`,
      },
      {
        id: 'comparison',
        h: 'Which way should you use?',
        html: `<table>
<thead><tr><th></th><th>System shortcuts</th><th>DevTools commands</th><th>FrameShot</th></tr></thead>
<tbody>
<tr><th>How to start</th><td>One key combination</td><td>Open DevTools, run a command</td><td>One click or a shortcut</td></tr>
<tr><th>What’s on screen</th><td>Yes</td><td>Yes, page only</td><td>Yes, page only</td></tr>
<tr><th>Whole page below the fold</th><td>No</td><td>Yes, simple pages work best</td><td>Yes, including sticky headers and lazy images</td></tr>
<tr><th>Area taller than the screen</th><td>No</td><td>No</td><td>Yes, scroll while selecting</td></tr>
<tr><th>One element</th><td>No</td><td>Yes, via the Elements panel</td><td>Yes, hover and click</td></tr>
<tr><th>Other apps and the desktop</th><td>Yes</td><td>No</td><td>No, web pages in Chrome only</td></tr>
<tr><th>Annotate and blur</th><td>Basic markup on some systems</td><td>No</td><td>Arrows, text, steps, blur and redaction</td></tr>
</tbody>
</table>
<p>A simple rule: use the system shortcut for a quick grab of anything on your screen, DevTools when you can’t install anything, and an extension when you need the whole page, a precise element, or a screenshot you’ll mark up and share.</p>`,
      },
      {
        id: 'after',
        h: 'What to do with a screenshot next',
        html: `<p>A raw screenshot is rarely the finished thing. A few quick steps make it far more useful:</p>
<ul>
<li><strong>Point at what matters.</strong> An arrow and a short note beat a paragraph of explanation. Our guide on <a href="/blog/how-to-annotate-a-screenshot">how to annotate a screenshot</a> shows which marks work best.</li>
<li><strong>Hide private details.</strong> Emails, names and account numbers turn up in screenshots more often than people notice. Use a solid box for anything secret; see <a href="/blog/how-to-blur-or-redact-sensitive-information-in-screenshots">how to blur or redact sensitive information</a>.</li>
<li><strong>Choose the right format.</strong> PNG keeps text sharp, JPEG and WebP make photos and long pages smaller, and a PDF is easy to attach and print. Read more in <a href="/blog/how-to-save-a-web-page-as-a-pdf-or-image">how to save a web page as a PDF or image</a>.</li>
<li><strong>Reporting a problem?</strong> Pair the screenshot with clear steps. Here’s a template for <a href="/blog/better-bug-reports-with-screenshots-and-screen-recordings">better bug reports</a>.</li>
</ul>
${callout('Info', '<p>Chrome doesn’t let any extension capture its own pages, such as <code>chrome://settings</code>, the Chrome Web Store or other extensions’ pages. Your system shortcut still works there.</p>')}`,
      },
      {
        id: 'faq',
        h: 'Common questions',
        html: `<h3>What is the shortcut to screenshot in Chrome?</h3>
<p>Chrome has no screenshot shortcut of its own outside DevTools. Use your system’s: ${k('Win+Shift+S')} on Windows, ${k('Cmd+Shift+4')} on a Mac and ${k('Ctrl+Show windows')} on a Chromebook. With FrameShot installed, ${k('Alt+Shift+F')} captures the full page and ${k('Alt+Shift+V')} the visible area.</p>
<h3>How do I screenshot a whole page in Chrome without an extension?</h3>
<p>Open DevTools, press ${k('Ctrl+Shift+P')} (${k('Cmd+Shift+P')} on a Mac), type <code>screenshot</code> and choose <strong>Capture full size screenshot</strong>. It works well on simple pages and less well on pages with sticky headers or inner scrolling panels.</p>
<h3>Where do Chrome screenshots go?</h3>
<p>It depends on the method. DevTools and extensions save to your Downloads folder. Windows saves to <strong>Pictures → Screenshots</strong> with ${k('Win+PrtScn')}, a Mac saves to the desktop, and a Chromebook saves to Downloads. Shortcuts that only copy to the clipboard don’t save a file until you paste it somewhere.</p>
<h3>Why is a video black in my screenshot?</h3>
<p>Many streaming services protect their videos, and Chrome often shows them as black in screenshots and screen recordings. That’s on purpose and not something a screenshot tool can work around.</p>`,
      },
    ],
  },

  'how-to-screenshot-on-a-chromebook': {
    intro: `<p>To screenshot on a Chromebook, press ${k('Ctrl+Show windows')} to capture the whole screen, or ${k('Ctrl+Shift+Show windows')} to drag over just part of it. The screenshot is saved to your Downloads folder and copied to the clipboard, ready to paste.</p>
<p>That covers most days. Below you’ll find the other ways to capture, what to do if your keyboard has no Show windows key, where every screenshot ends up, and how to capture a whole web page, not just what fits on the screen.</p>`,
    sections: [
      {
        id: 'full-screen',
        h: 'How to take a full-screen screenshot on a Chromebook',
        html: `<p>The <strong>Show windows</strong> key sits in the top row of a Chromebook keyboard, usually where F5 would be on another laptop. It looks like a rectangle with two short lines beside it, and on its own it shows all your open windows.</p>
<ol>
<li><strong>Get the screen ready.</strong> Open the page or app you want to capture and close anything you don’t want in the picture.</li>
<li><strong>Press ${k('Ctrl+Show windows')}.</strong> The screen flashes briefly.</li>
<li><strong>Check the notification.</strong> A preview appears in the corner of the screen. The screenshot is already saved, and it’s also on the clipboard, so you can paste it straight into a document, an email or a chat with ${k('Ctrl+V')}.</li>
</ol>
<p>If several screens are connected, the full-screen shortcut captures all of them; use the Screen capture tool below to pick one.</p>`,
      },
      {
        id: 'partial',
        h: 'How to screenshot part of the screen or one window',
        html: `<p>For a <strong>partial screenshot</strong>, press ${k('Ctrl+Shift+Show windows')}. The screen dims and the Screen capture toolbar appears at the bottom. Drag over the area you want, adjust the edges if needed, and click <strong>Capture</strong> or press ${k('Enter')}. ChromeOS remembers your last area, so the next partial screenshot starts from the same box.</p>
<p>For <strong>one window</strong>, press ${k('Ctrl+Alt+Show windows')}, then click the window you want. This is handy when Chrome sits next to another app and you only need one of them.</p>
<p>Press ${k('Esc')} at any time to cancel without taking a screenshot.</p>`,
      },
      {
        id: 'screen-capture-tool',
        h: 'Using Quick Settings and the Screen capture toolbar',
        html: `<p>If you’d rather click than remember shortcuts, the same tool is one click away:</p>
<ol>
<li><strong>Open Quick Settings</strong> by clicking the time in the bottom-right corner of the screen.</li>
<li><strong>Click Screen capture.</strong> The toolbar appears at the bottom of the screen.</li>
<li><strong>Make sure Screenshot is selected</strong>, not Screen record.</li>
<li><strong>Choose full screen, partial or window</strong>, then capture.</li>
</ol>
<p>The toolbar also has a settings button (the gear). That’s where you choose a different folder for your screenshots, and where the microphone option for screen recordings lives. The <strong>Screen record</strong> option on the same toolbar records video; for recording a browser tab with its sound, see <a href="/blog/how-to-record-your-screen-with-audio-in-chrome">how to record your screen with audio in Chrome</a>.</p>`,
      },
      {
        id: 'other-keyboards',
        h: 'No Show windows key? Newer keyboards, tablets and external keyboards',
        html: `<ul>
<li><strong>A Screenshot key.</strong> Some newer Chromebook keyboards have a dedicated screenshot key in the top row, marked with a camera-style icon. Press it to open the Screen capture toolbar.</li>
<li><strong>Tablets and convertibles in tablet mode.</strong> Press the <strong>power button</strong> and <strong>volume down</strong> at the same time, the same way you would on most phones. That takes a full-screen screenshot.</li>
<li><strong>External keyboards.</strong> On most standard keyboards, ${k('Ctrl+F5')} takes the place of ${k('Ctrl+Show windows')}, because F5 sits where the Show windows key would be. ${k('Ctrl+Shift+F5')} gives you a partial screenshot.</li>
<li><strong>No keyboard at all.</strong> Use Quick Settings → <strong>Screen capture</strong>, as above. It works with a touchscreen, a mouse or a stylus.</li>
</ul>`,
      },
      {
        id: 'where-saved',
        h: 'Where do screenshots go on a Chromebook?',
        html: `<p>By default, every screenshot is saved as a PNG in your <strong>Downloads</strong> folder. Open the <strong>Files</strong> app and choose <strong>My files → Downloads</strong>. Screenshots are named with the date and time they were taken, so the newest are easy to find when you sort by date.</p>
<p>A few other places are worth knowing:</p>
<ul>
<li><strong>The clipboard.</strong> Each screenshot is copied as well as saved, so ${k('Ctrl+V')} pastes it straight into most apps and websites.</li>
<li><strong>The shelf.</strong> On recent versions of ChromeOS, recent screenshots and downloads appear in a small area at the right of the shelf, called Tote, where you can drag them straight into an email or a document.</li>
<li><strong>A different folder.</strong> In the Screen capture toolbar, click the gear and choose another folder, for example one in Google Drive if you want your screenshots on other devices too.</li>
</ul>
${callout('Lightbulb', '<p>Downloads fills up fast on a Chromebook with little storage. Delete or move old screenshots now and then, or pick a dedicated folder for them in the Screen capture settings.</p>')}`,
      },
      {
        id: 'full-page',
        h: 'How to take a full-page screenshot on a Chromebook',
        html: `<p>The built-in tool only captures what’s on the screen. To capture a whole web page, top to bottom, you need Chrome’s DevTools or an extension. Extensions from the Chrome Web Store work on a Chromebook just as they do on Windows or a Mac, and <a href="/">FrameShot</a> is no exception: it runs inside Chrome, so it needs nothing else installed.</p>
<ol>
<li><strong>Add FrameShot to Chrome</strong> and pin it with the puzzle icon so it stays in the toolbar.</li>
<li><strong>Open the page</strong> you want to capture.</li>
<li><strong>Click the FrameShot icon and choose Full page</strong>, or press ${k('Alt+Shift+F')}.</li>
<li><strong>Stay on the tab</strong> while it scrolls and captures. A progress bar shows how far it has got, and ${k('Esc')} cancels.</li>
<li><strong>Edit and export.</strong> The capture opens in the editor. Download it as an image or a PDF, or copy it and paste it anywhere.</li>
</ol>
<p>The same popup offers <strong>Selected area</strong>, where you can scroll while selecting to capture a section taller than the screen, and <strong>Element</strong>, which captures one block of the page exactly to its edges. Our guide to <a href="/blog/how-to-take-a-full-page-screenshot-in-chrome">full-page screenshots in Chrome</a> covers sticky headers, endless feeds and very long pages in more detail.</p>
<p>Need to capture a menu that closes as soon as you press a key? Choose <strong>Visible area</strong> in the FrameShot popup and set a 3, 5 or 10 second delay. Open the menu or hover over the button while the countdown runs, and FrameShot takes the screenshot with it still open. The same works for tooltips and drop-down lists that ChromeOS’s own shortcuts tend to close.</p>`,
      },
      {
        id: 'annotate',
        h: 'Annotating and editing Chromebook screenshots',
        html: `<p>The notification that appears after a screenshot lets you open it for simple edits such as cropping. For anything more, like arrows, numbered steps, text or hiding private details, open the screenshot in an editor built for it.</p>
<p>FrameShot’s editor works on its own captures and on images you import, so it handles your ChromeOS screenshots too: open the library, then drag a file in, paste one from the clipboard or use the import button.</p>
${fig('editor', 'FrameShot Studio — Editor', 'A web page screenshot in the FrameShot editor with arrows, a highlighted box and numbered step markers', 'Arrows, boxes and numbered steps make a screenshot explain itself.')}
<ul>
<li><strong>Crop and resize</strong> with aspect presets such as 16:9 or 1:1.</li>
<li><strong>Add arrows, boxes, text and numbered steps</strong> that you can still move or change later.</li>
<li><strong>Blur, pixelate or redact</strong> names, emails and numbers before you share. Our guide on <a href="/blog/how-to-blur-or-redact-sensitive-information-in-screenshots">redacting screenshots</a> explains which to use when.</li>
</ul>
<p>When you’re done, export the result as PNG for sharp text, as JPEG or WebP for a smaller file, or as a PDF that’s easy to attach to an assignment or a form. Or copy it to the clipboard and paste it straight into a document, an email or a chat. If you work with lots of screenshots, the library keeps them searchable by page title and website, and you can sort them into collections.</p>
<p>Everything stays on your Chromebook. FrameShot has no account and uploads nothing, which matters on school and work devices; <a href="/blog/why-frameshot-keeps-your-screenshots-on-your-device">here’s how that works</a>.</p>`,
      },
      {
        id: 'faq',
        h: 'Common questions',
        html: `<h3>How do you screenshot on a Chromebook without the Show windows key?</h3>
<p>Open Quick Settings (click the time) and choose <strong>Screen capture</strong>. On an external keyboard, ${k('Ctrl+F5')} usually works in place of ${k('Ctrl+Show windows')}. In tablet mode, press the power button and volume down together.</p>
<h3>Why can’t I take a screenshot on my school Chromebook?</h3>
<p>Schools and workplaces can turn off screenshots and screen recording on managed Chromebooks. If the shortcuts do nothing and Screen capture is missing or greyed out, the setting comes from your administrator, and only they can change it.</p>
<h3>How do I screenshot a whole web page on a Chromebook?</h3>
<p>The built-in tool captures the screen only. Use a Chrome extension such as FrameShot and choose <strong>Full page</strong>, or use the <strong>Capture full size screenshot</strong> command in Chrome’s DevTools.</p>
<h3>Can I record my screen on a Chromebook too?</h3>
<p>Yes. Choose <strong>Screen record</strong> in the Screen capture toolbar. To record a Chrome tab with its sound, your microphone and a webcam bubble, a recorder extension gives you more control; when you share your entire screen, Chrome on ChromeOS can include the system sound as well.</p>`,
      },
    ],
  },

  'how-to-screen-record-on-windows': {
    intro: `<p>The quickest way to screen record on Windows 11 is the Snipping Tool: open it, switch to <strong>Record</strong>, drag over the area you want and click <strong>Start</strong>. For games and single apps there’s the Xbox Game Bar (${k('Win+Alt+R')}), PowerPoint has a screen recorder built in, and a Chrome extension can record a tab, a window or your whole screen with sound, your microphone and a webcam bubble.</p>
<p>Each one is good at something different. Here’s how to use all four, what sound each can record, and a table to help you choose.</p>`,
    sections: [
      {
        id: 'snipping-tool',
        h: 'How to screen record with Snipping Tool',
        html: `<p>Snipping Tool comes with Windows 11 and is the simplest way to record any part of your screen, including the desktop and File Explorer.</p>
<ol>
<li><strong>Open Snipping Tool.</strong> Press ${k('Win')}, type <em>Snipping Tool</em> and open it.</li>
<li><strong>Switch to Record</strong> with the video camera button at the top of the window.</li>
<li><strong>Click New</strong> and drag a box over the area you want to record. To record everything, drag across the whole screen.</li>
<li><strong>Choose your sound.</strong> Recent versions have buttons for your microphone and for the computer’s sound in the recording bar. Switch on the ones you need.</li>
<li><strong>Click Start.</strong> A short countdown runs, then recording begins.</li>
<li><strong>Click Stop</strong> (the red square) when you’re done. The recording opens in a preview.</li>
</ol>
<p>Depending on your version, the video is saved automatically as an MP4 in <strong>Videos → Screen Recordings</strong>, or you save it from the preview with the save button. Keep Windows up to date: older versions of Snipping Tool can’t record sound at all.</p>`,
      },
      {
        id: 'game-bar',
        h: 'How to record with the Xbox Game Bar',
        html: `<p>The Xbox Game Bar is built into Windows 10 and 11. It was made for games, but it can record most apps too.</p>
<ol>
<li><strong>Open the app</strong> you want to record and click into it.</li>
<li><strong>Press ${k('Win+G')}</strong> to open the Game Bar, then click the record button in the Capture widget. Or skip the overlay and press ${k('Win+Alt+R')} to start recording straight away.</li>
<li><strong>Turn your microphone on or off</strong> with ${k('Win+Alt+M')} while recording.</li>
<li><strong>Press ${k('Win+Alt+R')} again</strong> to stop.</li>
</ol>
<p>Recordings are saved as MP4 files in <strong>Videos → Captures</strong>. The catch is that the Game Bar records <strong>one app window</strong> at a time. It can’t record the desktop or File Explorer, and if you switch to another app, that app isn’t in the video. It’s great for a game or a single program, and a poor fit for a walkthrough that moves between apps.</p>`,
      },
      {
        id: 'powerpoint',
        h: 'Recording your screen with PowerPoint',
        html: `<p>If you have PowerPoint installed, it has a screen recorder that many people never notice. It’s useful when the recording is going into a presentation anyway.</p>
<ol>
<li><strong>Open a presentation</strong> and go to <strong>Insert → Screen Recording</strong>. PowerPoint minimises and a small control dock appears at the top of the screen.</li>
<li><strong>Click Select Area</strong> and drag over the part of the screen to record.</li>
<li><strong>Check Audio and Record Pointer</strong> in the dock. Both are on by default.</li>
<li><strong>Click Record.</strong> To stop, press ${k('Win+Shift+Q')}, or move the pointer to the top of the screen to bring the dock back and click Stop.</li>
<li><strong>Save the video.</strong> The recording is inserted on the current slide. To keep it as a separate file, right-click it and choose <strong>Save Media as</strong>.</li>
</ol>
<p>It’s a handy trick, but the extra steps make it slower than the other options when you just want a video file.</p>`,
      },
      {
        id: 'chrome',
        h: 'How to screen record in Chrome on Windows',
        html: `<p>Most of what people record today happens in the browser: web apps, dashboards, online lessons, a bug in a website. A Chrome extension is built for exactly that. <a href="/">FrameShot</a> adds a screen recorder to Chrome that can record a tab, an app window or your entire screen, with your microphone, the tab’s or the computer’s sound and a webcam bubble, all mixed into one video.</p>
<ol>
<li><strong>Click the FrameShot icon and choose Record screen.</strong> The recorder opens in a new tab.</li>
<li><strong>Switch on what you need:</strong> the microphone, the tab or system sound, and the camera. A live meter shows that your microphone is working.</li>
<li><strong>Pick a quality and a countdown.</strong> 1080p at 30 frames per second suits most tutorials; you can go up to 4K or 60 fps.</li>
<li><strong>Click Start recording.</strong> Chrome asks what to share: a tab, a window or your entire screen. Pick one and click <strong>Share</strong>.</li>
<li><strong>Record.</strong> Pause and resume as often as you need; the pauses are left out of the video.</li>
<li><strong>Stop</strong> from the recorder, the FrameShot popup or Chrome’s <strong>Stop sharing</strong> bar. The video opens in the player, ready to download as MP4.</li>
</ol>
${fig('recorder', 'FrameShot Studio — Recorder', 'The FrameShot recorder in Chrome with the microphone and system sound on and a round webcam bubble in the corner of the preview', 'Choose your sound and camera, then pick a tab, a window or the whole screen.')}
<p>The webcam appears as a round bubble in a corner of the video. You choose the corner and the size, and you can move it while you record so it never covers what you’re pointing at. Our guide on <a href="/blog/how-to-record-a-video-tutorial-with-your-webcam">recording a video tutorial with your webcam</a> has tips for that.</p>
<p>Recordings are saved on your computer as you go, in small pieces. If Chrome or Windows crashes in the middle, open FrameShot again and it offers to recover the recording.</p>`,
      },
      {
        id: 'sound',
        h: 'How to screen record on Windows with sound',
        html: `<p>Sound is where screen recordings most often go wrong. Here’s what to check for each option:</p>
<ul>
<li><strong>Snipping Tool:</strong> switch on the microphone and system sound buttons before you click Start. If you don’t see them, update Snipping Tool from the Microsoft Store.</li>
<li><strong>Xbox Game Bar:</strong> records the app’s own sound. Your microphone is off unless you switch it on with ${k('Win+Alt+M')}.</li>
<li><strong>Chrome, sharing a tab:</strong> keep <strong>Also share tab audio</strong> switched on in Chrome’s share dialog.</li>
<li><strong>Chrome, sharing your entire screen:</strong> tick <strong>Also share system audio</strong>. On Windows, this records everything your computer plays, from any app.</li>
<li><strong>Chrome, sharing a window:</strong> Chrome never shares a single window’s sound. Choose a tab or your entire screen when sound matters.</li>
</ul>
<p>FrameShot shows a hint for your system before you start and a warning straight away if a recording begins without the sound you asked for, so you can try again instead of finding out after a long take. The full walkthrough is in <a href="/blog/how-to-record-your-screen-with-audio-in-chrome">how to record your screen with audio in Chrome</a>.</p>
${callout('Lightbulb', '<p>Recording your microphone and the computer’s sound at the same time? Wear headphones. Otherwise the microphone also picks up your speakers and the video has an echo.</p>')}`,
      },
      {
        id: 'comparison',
        h: 'Which Windows screen recorder should you use?',
        html: `<table>
<thead><tr><th></th><th>Snipping Tool</th><th>Xbox Game Bar</th><th>PowerPoint</th><th>FrameShot in Chrome</th></tr></thead>
<tbody>
<tr><th>How to start</th><td>Open it, switch to Record</td><td>${k('Win+Alt+R')}</td><td>Insert → Screen Recording</td><td>Toolbar icon → Record screen</td></tr>
<tr><th>What it records</th><td>An area or the full screen</td><td>One app window</td><td>A selected area</td><td>A tab, a window or the entire screen</td></tr>
<tr><th>Desktop and File Explorer</th><td>Yes</td><td>No</td><td>Yes</td><td>Yes, when sharing the entire screen</td></tr>
<tr><th>Sound</th><td>Microphone and system sound on recent versions</td><td>The app’s sound, microphone optional</td><td>Audio option in the dock</td><td>Microphone plus tab or system sound</td></tr>
<tr><th>Webcam bubble</th><td>No</td><td>No</td><td>No</td><td>Yes, movable while recording</td></tr>
<tr><th>Saves as</th><td>MP4</td><td>MP4</td><td>Inside the slide, or MP4</td><td>MP4, or WebM</td></tr>
<tr><th>Good for</th><td>Quick clips of anything</td><td>Games and single apps</td><td>Videos for slides</td><td>Browser demos, tutorials, bug reports</td></tr>
</tbody>
</table>
<p>For a quick clip of something on your desktop, Snipping Tool is hard to beat. When the work happens in the browser, or you want your face and voice in the video, a Chrome recorder saves you switching tools. On a Mac, the options are different; see <a href="/blog/how-to-screen-record-on-a-mac-with-sound">how to screen record on a Mac with sound</a>.</p>`,
      },
      {
        id: 'tips',
        h: 'Tips for a clean recording',
        html: `<ul>
<li><strong>Silence notifications.</strong> Turn on Do Not Disturb from the notification centre so message previews don’t pop up mid-video.</li>
<li><strong>Share less.</strong> Record a single tab or a window rather than the whole screen when you can. It keeps other apps and private details out of the shot, and the video looks sharper.</li>
<li><strong>Tidy up first.</strong> Close tabs you don’t need, hide the bookmarks bar, and use a demo account rather than real customer data.</li>
<li><strong>Use the pause button.</strong> Pause while you set up the next step instead of recording a long silence.</li>
<li><strong>Short clips travel better.</strong> A ten-second moment often works best as a looping GIF in a chat or a ticket; see <a href="/blog/how-to-turn-a-screen-recording-into-a-gif">how to turn a screen recording into a GIF</a>.</li>
</ul>
<p>If you’re comparing recorders for Chrome more widely, our guide on <a href="/blog/how-to-choose-a-screen-recorder-extension-for-chrome">choosing a screen recorder extension</a> covers what to look for.</p>`,
      },
      {
        id: 'faq',
        h: 'Common questions',
        html: `<h3>Does Windows 11 have a built-in screen recorder?</h3>
<p>Yes, two. Snipping Tool has a Record mode for any area of the screen, and the Xbox Game Bar records one app window with ${k('Win+Alt+R')}.</p>
<h3>How do I screen record on Windows 10?</h3>
<p>Use the Xbox Game Bar (${k('Win+G')}), which is built into Windows 10, or PowerPoint’s Screen Recording. Recording in Snipping Tool is a Windows 11 feature. A Chrome extension works the same on Windows 10 and 11.</p>
<h3>Why can’t Game Bar record my desktop?</h3>
<p>The Game Bar only records a single app window, and it doesn’t treat the desktop or File Explorer as an app. Use Snipping Tool, or share your entire screen from a Chrome recorder.</p>
<h3>How do I record my screen and webcam at the same time on Windows?</h3>
<p>The built-in tools don’t add a webcam. In FrameShot, switch on the camera in the recorder and your face appears in a round bubble that’s part of the video file, so there’s nothing to line up afterwards.</p>`,
      },
    ],
  },

  'how-to-screen-record-on-a-mac-with-sound': {
    intro: `<p>To screen record on a Mac with sound, press ${k('Cmd+Shift+5')}, open <strong>Options</strong> and pick a microphone before you click <strong>Record</strong>. That records your voice. The Mac’s built-in tools don’t record the Mac’s own sound, like a video or a call playing in an app, without extra software; to record a Chrome tab with its sound, use a recorder extension instead.</p>
<p>This guide shows both ways, explains why so many Mac recordings come out silent, and covers recording your whole screen with system sound on recent versions of macOS.</p>`,
    sections: [
      {
        id: 'why-no-sound',
        h: 'Why your Mac screen recording has no sound',
        html: `<p>There are two kinds of sound in a screen recording, and macOS treats them very differently:</p>
<ul>
<li><strong>Your microphone:</strong> your voice, or whatever is in the room. The Mac’s screen recorder can record this, but only if you choose a microphone first. The default is often <em>None</em>, which is why a first recording is so often silent.</li>
<li><strong>The Mac’s own sound:</strong> everything that comes out of the speakers, like a video, a notification or the other side of a call. The built-in screen recorder and QuickTime don’t capture this at all.</li>
</ul>
<p>So if your recording has no voice, check the microphone setting. If it has your voice but none of the sound from the screen, that’s the built-in tools working as designed. The rest of this guide shows how to get that sound too.</p>`,
      },
      {
        id: 'cmd-shift-5',
        h: 'How to screen record on a Mac with your voice',
        html: `<p>The Screenshot toolbar has been built into macOS for years and records both the screen and your microphone:</p>
<ol>
<li><strong>Press ${k('Cmd+Shift+5')}.</strong> A toolbar appears at the bottom of the screen.</li>
<li><strong>Choose Record Entire Screen or Record Selected Portion.</strong> For a portion, drag the box over the area you want.</li>
<li><strong>Click Options and pick a microphone</strong>, for example the built-in microphone or your headset. You can also choose where to save, set a timer and show mouse clicks.</li>
<li><strong>Click Record.</strong></li>
<li><strong>Stop</strong> with the stop button in the menu bar, or press ${k('Cmd+Control+Esc')}.</li>
</ol>
<p>The recording is saved as a <code>.mov</code> file on the desktop unless you chose another place. A thumbnail appears in the corner first; click it to trim the clip or share it, or leave it and it saves by itself. The microphone you pick is remembered for next time.</p>`,
      },
      {
        id: 'quicktime',
        h: 'Recording with QuickTime Player',
        html: `<p>QuickTime Player can record the screen too. On recent versions of macOS, choosing <strong>File → New Screen Recording</strong> opens the same toolbar as ${k('Cmd+Shift+5')}, with the same Options menu and the same microphone choice. The difference is that the finished recording opens in QuickTime, so you can play it back and save it under a name you choose.</p>
<p>The sound rules are the same as above: the microphone yes, the Mac’s own sound no. You’ll find older guides suggesting extra audio software that routes the Mac’s sound into a fake microphone. It can work, but it means installing a system audio driver and remembering to switch your sound settings back afterwards. If what you want to record is in your browser, there’s an easier way.</p>`,
      },
      {
        id: 'chrome-tab',
        h: 'How to record a Chrome tab with its sound',
        html: `<p>Chrome can share a tab’s sound with a screen recorder on every system, including every Mac, with no extra software. That covers most of what people want to record: a web app demo, an online lesson, a video, a presentation in the browser. Recording through Chrome also lets you add your microphone and webcam in the same video.</p>
<p>Here’s how with <a href="/">FrameShot, a screen recorder and screenshot extension for Chrome</a>:</p>
<ol>
<li><strong>Open the tab</strong> you want to record, then click the FrameShot icon and choose <strong>Record screen</strong>. The recorder opens in its own tab.</li>
<li><strong>Switch on tab sound</strong>, and the microphone if you want to talk over it. The first time, Chrome asks for permission to use the microphone.</li>
<li><strong>Add the camera</strong> if you want a webcam bubble in a corner of the video.</li>
<li><strong>Click Start recording.</strong> In Chrome’s dialog, choose the tab, keep <strong>Also share tab audio</strong> switched on, and click <strong>Share</strong>.</li>
<li><strong>Record,</strong> pausing whenever you need to. Pauses are left out of the video.</li>
<li><strong>Stop</strong> from the recorder, the popup or Chrome’s <strong>Stop sharing</strong> bar, then download the video as MP4.</li>
</ol>
${fig('recorder', 'FrameShot Studio — Recorder', 'The FrameShot recorder with tab sound and the microphone switched on, a sound level meter and a camera bubble preview', 'Tab sound and your microphone are mixed into one track.')}
<p>Because the tab’s sound comes straight from Chrome, not through the speakers, it stays clean even if you mute your Mac or wear headphones. FrameShot also asks Chrome not to apply the voice-call processing meant for video calls to shared sound, where Chrome allows it, so music and soundtracks keep their full range.</p>`,
      },
      {
        id: 'system-sound',
        h: 'Recording your Mac’s own sound from the whole screen',
        html: `<p>Sometimes the sound you need comes from outside the browser: a desktop app, a game, a video call app. Chrome can share your <strong>entire screen</strong> with its system sound on a Mac, but only on newer versions:</p>
<ul>
<li><strong>macOS 14.2 or later</strong>, and</li>
<li><strong>Chrome 141 or later.</strong> Check yours at <code>chrome://settings/help</code>.</li>
</ul>
<p>When both are new enough, choose <strong>Entire screen</strong> in Chrome’s share dialog and tick <strong>Also share system audio</strong>. If that option isn’t there, one of the two needs an update; until then, share a tab instead.</p>
<p>The first time Chrome shares a window or the screen, macOS asks you to allow it in <strong>System Settings → Privacy &amp; Security</strong>, under the screen recording section. Switch Chrome on there, then quit and reopen Chrome when it asks. Sharing a single tab doesn’t need this permission.</p>
${callout('TriangleAlert', '<p>Sharing a single <strong>window</strong> never includes sound. Chrome doesn’t offer it on any system. Choose a tab, or your entire screen with system audio, whenever sound matters.</p>')}`,
      },
      {
        id: 'comparison',
        h: 'Which option records which sound?',
        html: `<table>
<thead><tr><th>Method</th><th>Your microphone</th><th>The Mac’s own sound</th><th>Webcam</th></tr></thead>
<tbody>
<tr><td>${k('Cmd+Shift+5')}</td><td>Yes, choose it in Options</td><td>No</td><td>No</td></tr>
<tr><td>QuickTime Player</td><td>Yes, choose it in Options</td><td>No</td><td>No</td></tr>
<tr><td>Chrome extension, sharing a tab</td><td>Yes</td><td>The tab’s sound, on every Mac</td><td>Yes, as a bubble</td></tr>
<tr><td>Chrome extension, sharing the entire screen</td><td>Yes</td><td>Yes, on macOS 14.2+ with Chrome 141+</td><td>Yes, as a bubble</td></tr>
<tr><td>Chrome extension, sharing a window</td><td>Yes</td><td>No</td><td>Yes, as a bubble</td></tr>
</tbody>
</table>
<p>For a quick clip with your voice, the built-in toolbar is fine. For anything with sound from the screen, a browser tab is the most reliable choice on any Mac.</p>`,
      },
      {
        id: 'tips',
        h: 'Tips for clean sound on a Mac',
        html: `<ul>
<li><strong>Wear headphones</strong> when you record your microphone and the screen’s sound together, so the microphone doesn’t pick up the speakers and add an echo.</li>
<li><strong>Check your input level</strong> in <strong>System Settings → Sound → Input</strong>, and watch the level meter in your recorder before you start.</li>
<li><strong>Pick the right microphone.</strong> If you have a headset or a USB microphone, choose it by name rather than relying on the default.</li>
<li><strong>Turn on a Focus</strong> such as Do Not Disturb so notification sounds and banners stay out of the recording.</li>
<li><strong>Make a five-second test</strong> and play it back. It’s much better than discovering a silent track after a long take.</li>
</ul>
<p>Once you have the video, a short clip can become a looping GIF for docs or chat (<a href="/blog/how-to-turn-a-screen-recording-into-a-gif">here’s how</a>), and a full tutorial benefits from a webcam bubble; see <a href="/blog/how-to-record-a-video-tutorial-with-your-webcam">recording a video tutorial with your webcam</a>. For the same steps on other systems, read <a href="/blog/how-to-record-your-screen-with-audio-in-chrome">how to record your screen with audio in Chrome</a>, and if you also use a PC, see <a href="/blog/how-to-screen-record-on-windows">how to screen record on Windows 11</a>.</p>`,
      },
      {
        id: 'faq',
        h: 'Common questions',
        html: `<h3>Why is there no sound when I screen record on my Mac?</h3>
<p>Either no microphone was selected (open Options in the ${k('Cmd+Shift+5')} toolbar and choose one), or you expected the Mac’s own sound, which the built-in tools don’t record. Record a Chrome tab with tab audio instead, or the entire screen with system audio on macOS 14.2 or later.</p>
<h3>Can QuickTime record internal audio?</h3>
<p>No. QuickTime records the screen and a microphone, but not the sound your Mac plays, unless you install extra audio software.</p>
<h3>How do I record a video call or webinar with sound on a Mac?</h3>
<p>If it runs in Chrome, share that tab with tab audio on. If it runs in a desktop app, share the entire screen and tick <strong>Also share system audio</strong>, which needs macOS 14.2 or later and Chrome 141 or later. Always tell the other people on the call that you’re recording.</p>
<h3>Where do Mac screen recordings go?</h3>
<p>Recordings made with ${k('Cmd+Shift+5')} are saved to the desktop by default, as <code>.mov</code> files. Recordings made in FrameShot are kept in its library on your Mac and download as MP4 to your Downloads folder.</p>`,
      },
    ],
  },

  'how-to-take-a-scrolling-screenshot': {
    intro: `<p>A scrolling screenshot captures more than fits on your screen: a whole web page, a long chat or a table that keeps going. Windows and macOS don’t have one built in, so the easiest way on a computer is a Chrome extension that scrolls and stitches for you, either for the entire page or for just one panel that scrolls on its own.</p>
<p>This guide explains why your system can’t do it, how to capture long pages and scrolling panels in Chrome, and how to avoid the usual problems: repeated headers, missing images and pages that never end.</p>`,
    sections: [
      {
        id: 'what-is',
        h: 'What is a scrolling screenshot?',
        html: `<p>A normal screenshot is a picture of the pixels on your screen right now. A scrolling screenshot, sometimes called a long screenshot, keeps going: the tool scrolls the content, takes a picture of each part and joins them into one tall image, with no gaps and no overlaps.</p>
<p>People usually need one for:</p>
<ul>
<li>a long article, receipt, invoice or order confirmation;</li>
<li>a whole conversation in a web chat or a support ticket;</li>
<li>a spreadsheet, dashboard or table with many rows;</li>
<li>a full landing page for a design review or a portfolio.</li>
</ul>`,
      },
      {
        id: 'why-no-built-in',
        h: 'Why Windows and Mac don’t have a scrolling screenshot',
        html: `<p>On Windows, ${k('Win+Shift+S')} and the Print Screen key capture what’s on the screen and nothing more. On a Mac, ${k('Cmd+Shift+4')} and ${k('Cmd+Shift+5')} are the same. Neither system has a scrolling option.</p>
<p>The reason is that the system doesn’t really know what’s inside each window. To capture beyond the edge, a tool has to scroll the content itself, wait for it to settle and work out where each slice fits. Inside a web page that’s possible, because the page can be measured and scrolled precisely. Across every desktop app, it isn’t: each app draws and scrolls its content in its own way.</p>
<p>That’s also why phones can do it: many Android phones offer a “capture more” button after a screenshot, and an iPhone can save a whole Safari page as a PDF from the screenshot preview. On a computer, the place to do it is the browser.</p>`,
      },
      {
        id: 'whole-page',
        h: 'How to take a scrolling screenshot of a whole web page',
        html: `<p>For an entire page, from the top of the page to the bottom, use a full-page capture. With <a href="/">FrameShot</a>, a screenshot and screen recording extension for Chrome, it’s one click:</p>
<ol>
<li><strong>Open the page</strong> in Chrome and scroll back to the top.</li>
<li><strong>Click the FrameShot icon and choose Full page</strong>, or press ${k('Alt+Shift+F')} (${k('Option+Shift+F')} on a Mac).</li>
<li><strong>Stay on the tab</strong> while FrameShot scrolls and captures. Press ${k('Esc')} to cancel, or <strong>Stop &amp; save</strong> to keep what it has captured so far.</li>
<li><strong>Edit and export</strong> the result as an image or a PDF.</li>
</ol>
<p>This works the same on Windows, Mac, ChromeOS and Linux, because it all happens inside Chrome. Chrome’s DevTools also has a <strong>Capture full size screenshot</strong> command, which is fine for simple pages. We compare the methods, and cover what goes wrong with each, in <a href="/blog/how-to-take-a-full-page-screenshot-in-chrome">how to take a full-page screenshot in Chrome</a>.</p>`,
      },
      {
        id: 'panels',
        h: 'How to capture a scrolling panel, chat or table',
        html: `<p>Many websites don’t scroll as a whole. The page stays still and only one box inside it scrolls: the message list in a web chat, the inbox in a mail app, a long table in a dashboard, a comments sidebar. A full-page screenshot of those often shows just the visible part of the box, because the page itself never gets any longer.</p>
<p>That’s what FrameShot’s <strong>Scrolling panel</strong> mode is for. It scrolls the box instead of the page and captures everything inside it.</p>
<ol>
<li><strong>Open the page</strong> with the chat, list or table you want.</li>
<li><strong>Click the FrameShot icon and choose Scrolling panel.</strong> You can also right-click the page and choose <strong>FrameShot → Capture a scrolling area</strong>.</li>
<li><strong>Move the pointer over the page.</strong> Areas that scroll are highlighted as you hover. If there’s no scrolling area under the pointer, FrameShot tells you, and you can use Full page instead.</li>
<li><strong>Click the panel.</strong> FrameShot scrolls through it, captures all of its content and joins it into one image. Press ${k('Esc')} to cancel.</li>
<li><strong>Edit and export.</strong> The capture opens in the editor, and the panel is scrolled back to where you left it.</li>
</ol>
${fig('editor', 'FrameShot Studio — Editor', 'A long capture of a scrolling panel stitched into one tall image and opened in the FrameShot editor', 'The whole panel in one image, ready to crop, annotate or redact.')}
<p>FrameShot’s full-page mode also spots the most common case, an app-style page whose main content scrolls inside a panel, and captures that panel automatically. Use Scrolling panel when you want a different box, like a sidebar, or when a page has several scrolling areas and you want to choose one.</p>
${callout('Lightbulb', '<p>In chats that load older messages as you scroll up, scroll up yourself first until everything you need has loaded. Then start the capture.</p>')}`,
      },
      {
        id: 'area',
        h: 'Capturing a long section without the rest of the page',
        html: `<p>Sometimes you need more than one screen, but not the whole page: a single long comment thread, one section of an article, a pricing table and nothing around it. Two other modes handle that:</p>
<ul>
<li><strong>Selected area</strong> (${k('Alt+Shift+A')}): drag a box, then scroll while selecting. The selection grows with the page, and FrameShot captures and joins every part of it.</li>
<li><strong>Element</strong> (${k('Alt+Shift+E')}): hover over the page and each block is highlighted. Press ${k('↑')} for the larger block around it or ${k('↓')} for a smaller one inside, then click. The capture is cut exactly to that element’s edges, even if it’s taller than the screen.</li>
</ul>
<p>There’s more on both, including when each one is the better choice, in <a href="/blog/how-to-screenshot-part-of-a-web-page">how to screenshot part of a web page</a>.</p>`,
      },
      {
        id: 'tips',
        h: 'Tips for clean scrolling screenshots',
        html: `<ul>
<li><strong>Sticky headers.</strong> A header that follows you down the page ends up in every slice if a tool simply joins screenshots. FrameShot shows sticky headers once, where they belong, and puts fixed footers only at the bottom. If you want a different result, the settings let you keep or hide fixed elements everywhere.</li>
<li><strong>Images that load late.</strong> Many pages only load images when they scroll into view. FrameShot loads them before it captures, so you don’t get empty boxes. On very slow sites, scroll through the page once yourself first.</li>
<li><strong>Endless feeds.</strong> Social feeds and search results keep loading more. FrameShot follows them up to the maximum height in its settings, and <strong>Stop &amp; save</strong> keeps what you have when it’s enough.</li>
<li><strong>Very long pages.</strong> Browsers limit how big one image can be. Instead of cutting the page off, FrameShot splits it into numbered parts at full resolution, or scales it into one image if you prefer that in the settings. It always tells you which happened.</li>
<li><strong>Stay put.</strong> Switching tabs, minimising the window or changing the zoom interrupts the capture. FrameShot notices and tells you, so you never save a broken image without knowing.</li>
<li><strong>Close the clutter.</strong> Dismiss cookie banners and chat bubbles before you start.</li>
<li><strong>Check before you share.</strong> Long captures contain a lot, often names and emails far down the page. Cover them with a solid box; see <a href="/blog/how-to-blur-or-redact-sensitive-information-in-screenshots">how to blur or redact sensitive information</a>.</li>
</ul>`,
      },
      {
        id: 'sharing',
        h: 'Sharing a very long screenshot',
        html: `<p>A tall image can be awkward to open on some devices and heavy to send. A few options make it easier:</p>
<ul>
<li><strong>Export as a PDF</strong> split across A4 or Letter pages, so it reads and prints like a document. Or keep it as one long page.</li>
<li><strong>Use JPEG or WebP</strong> for long, image-heavy pages, where PNG files get very large.</li>
<li><strong>Crop to what matters</strong> in the editor before you send it, and add an arrow or a note so people know where to look. Our guide on <a href="/blog/how-to-annotate-a-screenshot">how to annotate a screenshot</a> has ideas.</li>
</ul>
<p>For more on choosing between an image and a PDF, see <a href="/blog/how-to-save-a-web-page-as-a-pdf-or-image">how to save a web page as a PDF or image</a>.</p>`,
      },
      {
        id: 'faq',
        h: 'Common questions',
        html: `<h3>Can you take a scrolling screenshot on Windows?</h3>
<p>Not with the built-in tools. Snipping Tool and Print Screen only capture what’s on the screen. For web pages, use a Chrome extension with a full-page or scrolling-panel mode.</p>
<h3>How do I take a scrolling screenshot on a Mac?</h3>
<p>macOS has no scrolling screenshot either. In Chrome on a Mac, use FrameShot’s <strong>Full page</strong> (${k('Option+Shift+F')}) for a whole page, or <strong>Scrolling panel</strong> for a chat or list that scrolls inside the page.</p>
<h3>Why does my scrolling screenshot only show part of the page?</h3>
<p>The page probably scrolls inside a panel rather than as a whole, so the page itself never gets longer. Use <strong>Scrolling panel</strong> and click the area that scrolls, or let full-page mode detect the main panel.</p>
<h3>Can I take a scrolling screenshot of a desktop app or a PDF?</h3>
<p>FrameShot captures web pages in Chrome, not other apps. For a PDF, open it in the app it came from and export or print the pages you need instead.</p>`,
      },
    ],
  },
};
