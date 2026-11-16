/** Newer guides, part C (2026-11-16). Every FrameShot fact here matches FEATURES.md, README.md and PRIVACY.md. */
import { icon, windowFrame } from '../layout.mjs';

const k = (keys) => keys.split('+').map((x) => `<kbd>${x}</kbd>`).join('+');
const callout = (ic, html) => `<div class="callout">${icon(ic, 20)}<div>${html}</div></div>`;
const fig = (name, title, alt, caption, dark) =>
  `<figure>${windowFrame(name, { title, alt, sizes: '(max-width: 780px) 92vw, 740px', dark })}<figcaption>${caption}</figcaption></figure>`;

export const META_C = [
  {
    slug: 'how-to-screenshot-on-windows',
    title: 'How to Screenshot on Windows 10 and 11: Every Shortcut',
    description: 'How to screenshot on Windows with PrtScn, Win+Shift+S, Snipping Tool and Game Bar, where each one saves, and how to capture a full web page in Chrome.',
    tag: 'Guide',
    image: 'editor',
    alt: 'A screenshot taken on Windows and opened in the FrameShot editor with arrows and numbered steps',
    date: '2026-11-16',
    keywords: ['how to screenshot on windows', 'screenshot on windows 11', 'windows screenshot shortcut', 'print screen windows', 'win shift s', 'snipping tool', 'where do screenshots go windows', 'full page screenshot windows'],
  },
  {
    slug: 'how-to-screenshot-on-a-mac',
    title: 'How to Screenshot on a Mac: Shortcuts, Options and Tips',
    description: 'How to screenshot on Mac with Cmd+Shift+3, 4 and 5, copy to the clipboard, change where screenshots are saved, and capture a full web page in Chrome.',
    tag: 'Guide',
    image: 'library-light',
    alt: 'Screenshots taken on a Mac, organised in the FrameShot library',
    date: '2026-11-16',
    keywords: ['how to screenshot on mac', 'mac screenshot shortcut', 'cmd shift 4', 'cmd shift 5 options', 'where do screenshots go on mac', 'screenshot a window on mac', 'change screenshot location mac', 'full page screenshot mac'],
  },
  {
    slug: 'how-to-take-a-delayed-screenshot',
    title: 'How to Take a Delayed Screenshot With a Timer',
    description: 'How to take a screenshot with a timer or delay on Windows, Mac and in Chrome, so open menus, hover states and tooltips stay in the picture.',
    tag: 'Tips',
    image: 'popup',
    alt: 'The FrameShot popup with the Visible area capture mode and other capture options',
    date: '2026-11-16',
    keywords: ['screenshot with timer', 'delayed screenshot', 'screenshot delay', 'snipping tool delay', 'mac screenshot timer', 'screenshot a dropdown menu', 'screenshot hover state'],
  },
  {
    slug: 'how-to-copy-a-screenshot-to-the-clipboard',
    title: 'How to Copy a Screenshot to the Clipboard and Paste It',
    description: 'How to copy a screenshot to the clipboard on Windows, Mac and Chromebook, paste it into chats, docs and email, and keep clipboard history private.',
    tag: 'Workflow',
    image: 'library-dark',
    alt: 'Screenshots in the FrameShot library in dark mode, ready to copy or download',
    date: '2026-11-16',
    keywords: ['copy screenshot to clipboard', 'screenshot to clipboard', 'copy screenshot mac', 'paste screenshot', 'clipboard history screenshot', 'copy screenshot instead of save', 'screenshot clipboard windows'],
  },
  {
    slug: 'how-to-make-screenshots-look-professional',
    title: 'How to Make Screenshots Look Professional and Polished',
    description: 'Make screenshots look professional: crop tightly, keep sizes consistent, and beautify them with a background, padding, rounded corners and a browser frame.',
    tag: 'Workflow',
    image: 'composer',
    alt: 'A screenshot on a gradient background with padding, rounded corners and a browser frame in the FrameShot composer',
    date: '2026-11-16',
    keywords: ['make screenshots look professional', 'beautify screenshots', 'screenshot background', 'screenshot with browser frame', 'rounded corners screenshot', 'screenshot for social media', 'polished screenshots'],
  },
];

export const BODIES_C = {
  'how-to-screenshot-on-windows': {
    intro: `<p>The quickest way to screenshot on Windows is ${k('Win+Shift+S')}: drag over the part of the screen you want, and the image is copied to the clipboard, ready to paste. To save the whole screen as a file instead, press ${k('Win+PrtScn')}. The screen dims for a moment and a PNG appears in <strong>Pictures → Screenshots</strong>.</p>
<p>Windows 10 and 11 have a few more shortcuts, and each one behaves a little differently: some copy, some save, some capture only one window. Below you’ll find all of them, where every screenshot ends up, and how to capture a whole web page in Chrome, which none of the built-in tools can do.</p>`,
    sections: [
      {
        id: 'print-screen',
        h: 'What does the Print Screen key do?',
        html: `<p>The Print Screen key is usually labelled <strong>PrtScn</strong>, <strong>PrtSc</strong> or <strong>Print</strong>, and sits near the top right of the keyboard. What it does depends on your version of Windows:</p>
<ul>
<li><strong>On Windows 10</strong>, and on older builds of Windows 11, ${k('PrtScn')} copies an image of the entire screen to the clipboard. Nothing is saved; you paste it into an app with ${k('Ctrl+V')}.</li>
<li><strong>On recent versions of Windows 11</strong>, ${k('PrtScn')} opens the Snipping Tool bar instead, the same one you get with ${k('Win+Shift+S')}. If you prefer the old behaviour, go to <strong>Settings → Accessibility → Keyboard</strong> and switch off the option that uses the Print Screen key to open screen capture.</li>
</ul>
<p>Two variations are worth remembering. ${k('Alt+PrtScn')} copies only the active window, the one you last clicked, without the taskbar or anything behind it. And with several monitors, the plain full-screen captures include every screen side by side, so you’ll often want to crop afterwards.</p>
<p>On many laptops, Print Screen shares a key with another function. If nothing happens, hold the ${k('Fn')} key as well, for example ${k('Fn+PrtScn')} or ${k('Win+Fn+PrtScn')}. If your keyboard has no Print Screen key at all, ${k('Win+Shift+S')} does everything you need.</p>`,
      },
      {
        id: 'save-to-file',
        h: 'How to save a screenshot as a file automatically',
        html: `<p>If you take lots of screenshots and want them as files rather than on the clipboard, use ${k('Win+PrtScn')}:</p>
<ol>
<li><strong>Arrange the screen</strong> the way you want it to look. Close or move anything private, such as an open email.</li>
<li><strong>Press ${k('Win+PrtScn')}.</strong> The screen dims briefly to show the capture worked.</li>
<li><strong>Open File Explorer</strong> with ${k('Win+E')} and go to <strong>Pictures → Screenshots</strong>. The new file is there as a PNG.</li>
</ol>
<p>The file name includes either a running number or the date and time, depending on your version of Windows, so the newest screenshot is easy to find when you sort by date. The image is the full screen at its real resolution. On a high-resolution laptop display that’s a large picture, which is great for detail and less great for a quick chat message.</p>
<p>On many Windows tablets and 2-in-1s with no keyboard attached, pressing the <strong>power</strong> button and <strong>volume up</strong> together takes the same kind of full-screen screenshot.</p>`,
      },
      {
        id: 'snipping-tool',
        h: 'How to use Win+Shift+S and Snipping Tool',
        html: `<p>${k('Win+Shift+S')} is the most flexible built-in option, and it’s the one most people end up using every day. It opens a small bar at the top of the screen with four modes:</p>
<ul>
<li><strong>Rectangle:</strong> drag a box over any area.</li>
<li><strong>Window:</strong> click a single window to capture just that window.</li>
<li><strong>Full screen:</strong> capture everything at once.</li>
<li><strong>Freeform:</strong> draw any shape around what you want.</li>
</ul>
<ol>
<li><strong>Press ${k('Win+Shift+S')}.</strong> The screen dims and the bar appears.</li>
<li><strong>Pick a mode</strong> and make your selection. Press ${k('Esc')} to back out without capturing.</li>
<li><strong>Paste it</strong> with ${k('Ctrl+V')} into a document, an email or a chat. The capture is already on the clipboard.</li>
<li><strong>Or click the notification</strong> that pops up in the corner to open it in Snipping Tool, where you can crop it, draw on it with a pen or highlighter, and save it as a file.</li>
</ol>
<p>On recent versions of Windows 11, Snipping Tool also saves every capture automatically to <strong>Pictures → Screenshots</strong>, so you get a file as well as the clipboard copy. You can switch that off in Snipping Tool’s settings if you only want the clipboard. On Windows 10, the same shortcut opens an older snipping bar that copies to the clipboard but doesn’t save a file on its own.</p>
<p>The Snipping Tool app itself, opened from the Start menu, has one thing the shortcut doesn’t: a delay of a few seconds before the capture, which is how you screenshot a menu that closes as soon as you press a key. There’s a full walkthrough in <a href="/blog/how-to-take-a-delayed-screenshot">how to take a delayed screenshot</a>.</p>`,
      },
      {
        id: 'game-bar',
        h: 'Taking screenshots with the Xbox Game Bar',
        html: `<p>The Xbox Game Bar is built into Windows 10 and 11. It’s designed for games but works in most apps:</p>
<ul>
<li>Press ${k('Win+G')} to open it, then click the camera button in the <strong>Capture</strong> widget.</li>
<li>Or press ${k('Win+Alt+PrtScn')} to take a screenshot straight away without opening the overlay.</li>
</ul>
<p>Game Bar screenshots are saved as PNG files in <strong>Videos → Captures</strong>, not in Pictures, which catches a lot of people out. They show only the active app’s window, never the desktop or File Explorer. That’s ideal for a game running full screen and the wrong tool for most other jobs.</p>
<p>The same bar records video too. If that’s what you’re after, see <a href="/blog/how-to-screen-record-on-windows">how to screen record on Windows 11</a>, which compares it with Snipping Tool’s recorder and a Chrome extension.</p>`,
      },
      {
        id: 'comparison',
        h: 'Which Windows screenshot shortcut should you use?',
        html: `<table>
<thead><tr><th>Method</th><th>What it captures</th><th>Saves a file?</th><th>Good for</th></tr></thead>
<tbody>
<tr><td>${k('PrtScn')}</td><td>The entire screen, or opens the snipping bar on recent Windows 11</td><td>No, clipboard only (unless it opens Snipping Tool)</td><td>Pasting the whole screen somewhere fast</td></tr>
<tr><td>${k('Alt+PrtScn')}</td><td>The active window</td><td>No, clipboard only</td><td>One app without the clutter around it</td></tr>
<tr><td>${k('Win+PrtScn')}</td><td>The entire screen</td><td>Yes, in Pictures → Screenshots</td><td>Keeping a file of everything on screen</td></tr>
<tr><td>${k('Win+Shift+S')}</td><td>An area, a window, the full screen or a freeform shape</td><td>Clipboard, plus a file on recent Windows 11</td><td>Everyday captures you paste or mark up</td></tr>
<tr><td>${k('Win+Alt+PrtScn')}</td><td>The active app, through the Game Bar</td><td>Yes, in Videos → Captures</td><td>Games and full-screen apps</td></tr>
<tr><td>A Chrome extension</td><td>Web pages: visible area, full page, area or element</td><td>Yes, when you download; or copy instead</td><td>Pages longer than the screen, annotated screenshots</td></tr>
</tbody>
</table>
<p>A simple rule: ${k('Win+Shift+S')} for anything you’re about to paste, ${k('Win+PrtScn')} when you want a file without thinking about it, and a browser tool when the thing you need is a web page that doesn’t fit on one screen.</p>`,
      },
      {
        id: 'where-saved',
        h: 'Where do screenshots go on Windows?',
        html: `<p>It depends on the shortcut, and this is where most “my screenshot disappeared” moments come from:</p>
<ul>
<li><strong>Clipboard only:</strong> ${k('PrtScn')} on older setups and ${k('Alt+PrtScn')} don’t create a file. The image sits on the clipboard until you paste it or copy something else. Copy a line of text afterwards and the screenshot is gone.</li>
<li><strong>Pictures → Screenshots:</strong> ${k('Win+PrtScn')}, and Snipping Tool captures on recent Windows 11 while automatic saving is on.</li>
<li><strong>Videos → Captures:</strong> anything taken with the Xbox Game Bar.</li>
<li><strong>Wherever you choose:</strong> when you click Save in Snipping Tool, it asks for a folder and a format.</li>
</ul>
<p>If OneDrive backs up your Pictures folder, the Screenshots folder may live inside your OneDrive folder rather than only on the computer. Check OneDrive’s backup settings if screenshots show up on your other devices, or don’t show up where you expect.</p>
<p>To find a lost screenshot quickly, open File Explorer, search for <code>Screenshot</code> and sort by date modified. Turning on clipboard history with ${k('Win+V')} also helps: it keeps your recent copies, screenshots included, so one stray ${k('Ctrl+C')} doesn’t wipe out a capture. Our guide on <a href="/blog/how-to-copy-a-screenshot-to-the-clipboard">copying a screenshot to the clipboard</a> covers that, and the privacy side of it. Once screenshots pile up, <a href="/blog/how-to-organize-screenshots">how to organize screenshots</a> helps you keep them findable.</p>`,
      },
      {
        id: 'full-page',
        h: 'How to screenshot a full web page on Windows',
        html: `<p>Every Windows shortcut captures only what’s on the screen right now. A long article, a receipt or a dashboard that scrolls needs a tool that scrolls for you. In Chrome, a screenshot extension handles that. <a href="/">FrameShot, our screenshot and screen recording extension for Chrome</a>, works the same way on Windows 10 and 11:</p>
<ol>
<li><strong>Add FrameShot to Chrome</strong> and pin it: click the puzzle icon in the toolbar, then the pin next to FrameShot.</li>
<li><strong>Open the page</strong> you want to capture.</li>
<li><strong>Press ${k('Alt+Shift+F')}</strong>, or click the FrameShot icon and choose <strong>Full page</strong>.</li>
<li><strong>Stay on the tab</strong> while it scrolls and captures. Press ${k('Esc')} to cancel, or <strong>Stop &amp; save</strong> to keep what it has captured so far.</li>
<li><strong>Edit and export.</strong> The screenshot opens in the editor. Download it as PNG, JPEG, WebP or PDF, or copy it to the clipboard.</li>
</ol>
<p>Sticky headers appear once instead of on every screen, and images that load as you scroll are loaded before they’re captured. The popup also offers <strong>Visible area</strong> (${k('Alt+Shift+V')}), <strong>Selected area</strong> (${k('Alt+Shift+A')}), where you can scroll while selecting, <strong>Element</strong> (${k('Alt+Shift+E')}) for one exact block of the page, and <strong>Scrolling panel</strong> for chats and side panels that scroll on their own. Chrome assigns those shortcuts only when they don’t clash with another extension, and you can change them at <code>chrome://extensions/shortcuts</code>.</p>
<p>Long pages have their own quirks, covered in <a href="/blog/how-to-take-a-full-page-screenshot-in-chrome">how to take a full-page screenshot in Chrome</a> and <a href="/blog/how-to-take-a-scrolling-screenshot">how to take a scrolling screenshot</a>.</p>
${callout('Info', `<p>No extension can capture Chrome’s own pages, such as <code>chrome://settings</code> or the Chrome Web Store. ${k('Win+Shift+S')} still works there.</p>`)}`,
      },
      {
        id: 'annotate',
        h: 'How to annotate a screenshot on Windows',
        html: `<p>Snipping Tool covers the basics: crop, a pen, a highlighter and an eraser, with a few more tools on recent versions. When a screenshot needs to explain something, such as a bug, a step in a process or a change you’d like made, it helps to have arrows, text and numbered steps you can still move after you’ve placed them.</p>
<p>FrameShot’s editor isn’t limited to its own captures. Open the library and drag in a screenshot from File Explorer, paste one you just took with ${k('Win+Shift+S')}, or use the import button. Then:</p>
<ul>
<li><strong>Crop</strong> to the part that matters, freely or with presets such as 16:9 and 1:1.</li>
<li><strong>Add arrows, boxes, text and numbered steps.</strong> Our guide on <a href="/blog/how-to-annotate-a-screenshot">how to annotate a screenshot</a> shows which marks work best.</li>
<li><strong>Hide private details</strong> with blur, pixelate or a solid redaction box. For passwords and card numbers, use the solid box; <a href="/blog/how-to-blur-or-redact-sensitive-information-in-screenshots">here’s why</a>.</li>
<li><strong>Copy the result</strong> and paste it straight into an email or a chat, or download it as a file.</li>
</ul>
${fig('editor', 'FrameShot Studio — Editor', 'A screenshot in the FrameShot editor with an arrow, numbered step markers and a short text note', 'Arrows, numbered steps and a short note make a screenshot explain itself.')}
<p>For screenshots that go on a website, into slides or onto social media, a background, padding and a browser frame make a surprising difference. See <a href="/blog/how-to-make-screenshots-look-professional">how to make screenshots look professional</a>.</p>`,
      },
      {
        id: 'faq',
        h: 'Common questions',
        html: `<h3>How do I screenshot on Windows without the Print Screen key?</h3>
<p>Press ${k('Win+Shift+S')}, which doesn’t need Print Screen at all, or open Snipping Tool from the Start menu and click <strong>New</strong>. On a laptop where Print Screen shares a key, try holding ${k('Fn')} with it.</p>
<h3>Why does Print Screen open Snipping Tool?</h3>
<p>Recent versions of Windows 11 set it up that way by default. To make ${k('PrtScn')} copy the full screen again, switch off the Print Screen option in <strong>Settings → Accessibility → Keyboard</strong>.</p>
<h3>Where do Win+Shift+S screenshots go?</h3>
<p>They’re copied to the clipboard. On recent versions of Windows 11, Snipping Tool also saves them to <strong>Pictures → Screenshots</strong> unless you’ve turned automatic saving off in its settings.</p>
<h3>How do I screenshot just one window?</h3>
<p>Click the window, then press ${k('Alt+PrtScn')} to copy it. Or press ${k('Win+Shift+S')}, choose <strong>Window</strong> mode and click the window you want.</p>
<h3>Can Windows take a scrolling screenshot?</h3>
<p>Not with its built-in tools. For web pages, a Chrome extension such as FrameShot captures the full page or a scrolling panel in one image; see <a href="/blog/how-to-take-a-scrolling-screenshot">how to take a scrolling screenshot</a>.</p>`,
      },
    ],
  },

  'how-to-screenshot-on-a-mac': {
    intro: `<p>To screenshot on a Mac, press ${k('Cmd+Shift+3')} for the whole screen or ${k('Cmd+Shift+4')} to drag over part of it. The screenshot is saved to your desktop as a PNG, and a thumbnail appears in the corner for a few seconds so you can mark it up first. ${k('Cmd+Shift+5')} opens a toolbar with every option in one place, including a timer and a choice of where to save.</p>
<p>Below you’ll find each shortcut and the small tricks hidden inside them, how to copy a screenshot instead of saving it, where screenshots go and how to change that, and how to capture a full web page in Chrome on a Mac.</p>`,
    sections: [
      {
        id: 'whole-screen',
        h: 'How to screenshot the whole screen on a Mac',
        html: `<ol>
<li><strong>Get the screen ready.</strong> Close windows you don’t want in the picture and hide anything private.</li>
<li><strong>Press ${k('Cmd+Shift+3')}.</strong> You’ll hear a camera sound if your volume is up.</li>
<li><strong>Find the file.</strong> A thumbnail slides in at the bottom right. Leave it and the screenshot is saved to the desktop a few seconds later, or click it to edit first.</li>
</ol>
<p>With more than one display connected, ${k('Cmd+Shift+3')} saves one file per display rather than one wide image. On MacBook Pro models with a Touch Bar, ${k('Cmd+Shift+6')} captures the Touch Bar itself, which is mostly useful for support questions about it.</p>
<p>A full-screen screenshot on a Retina display is large, often twice the width and height you’d expect, because it’s saved at the display’s real resolution. That keeps text crisp, but it’s worth cropping before you send it anywhere.</p>`,
      },
      {
        id: 'part-or-window',
        h: 'How to screenshot part of the screen or a single window',
        html: `<p>${k('Cmd+Shift+4')} turns the pointer into a crosshair. Drag over the area you want and let go to take the screenshot. While you drag, a few keys change how the selection behaves:</p>
<ul>
<li>Hold ${k('Shift')} to lock the selection in one direction, so only the width or only the height changes.</li>
<li>Hold ${k('Option')} to grow the selection from its centre.</li>
<li>Hold ${k('Space')} to move the whole selection without changing its size.</li>
<li>Press ${k('Esc')} to cancel without taking anything.</li>
</ul>
<p>To capture <strong>one window</strong> neatly, without the desktop around it:</p>
<ol>
<li><strong>Press ${k('Cmd+Shift+4')}</strong>, then tap ${k('Space')}. The crosshair becomes a camera icon.</li>
<li><strong>Move over the window</strong> you want. It’s highlighted in blue.</li>
<li><strong>Click</strong> to capture it. Hold ${k('Option')} while you click if you don’t want the window’s drop shadow in the image.</li>
</ol>
<p>Window captures work for menus too: open a menu, then use the same shortcut and click the menu itself.</p>`,
      },
      {
        id: 'toolbar',
        h: 'The Cmd+Shift+5 screenshot toolbar and its options',
        html: `<p>${k('Cmd+Shift+5')} opens a toolbar at the bottom of the screen on macOS Mojave and later. You can also open it from the <strong>Screenshot</strong> app in <strong>Applications → Utilities</strong>. The first three buttons take screenshots: <strong>Capture Entire Screen</strong>, <strong>Capture Selected Window</strong> and <strong>Capture Selected Portion</strong>. The next two record video, which is covered in <a href="/blog/how-to-screen-record-on-a-mac-with-sound">how to screen record on a Mac with sound</a>.</p>
<p>The <strong>Options</strong> menu is where the useful settings live:</p>
<ul>
<li><strong>Save to:</strong> Desktop, Documents, Clipboard, Mail, Messages, Preview, or <strong>Other Location</strong> to pick any folder. Whatever you choose here also applies to the keyboard shortcuts from then on.</li>
<li><strong>Timer:</strong> None, 5 seconds or 10 seconds, so you can open a menu before the capture. More on that in <a href="/blog/how-to-take-a-delayed-screenshot">how to take a delayed screenshot</a>.</li>
<li><strong>Show Floating Thumbnail:</strong> turn this off if you want screenshots saved instantly, with no preview in the corner.</li>
<li><strong>Remember Last Selection:</strong> keeps the same area for the next partial screenshot, which is handy when you’re capturing the same spot again and again.</li>
<li><strong>Show Mouse Pointer:</strong> includes the pointer in the image, useful in step-by-step instructions.</li>
</ul>
<p>Choose a mode, then click <strong>Capture</strong>, or press ${k('Esc')} to close the toolbar.</p>`,
      },
      {
        id: 'shortcuts',
        h: 'Every Mac screenshot shortcut at a glance',
        html: `<table>
<thead><tr><th>Shortcut</th><th>What it captures</th><th>Where it goes</th></tr></thead>
<tbody>
<tr><td>${k('Cmd+Shift+3')}</td><td>The entire screen, one file per display</td><td>Desktop, or your chosen location</td></tr>
<tr><td>${k('Cmd+Shift+4')}</td><td>An area you drag</td><td>Desktop, or your chosen location</td></tr>
<tr><td>${k('Cmd+Shift+4')}, then ${k('Space')}</td><td>One window or menu</td><td>Desktop, or your chosen location</td></tr>
<tr><td>${k('Cmd+Shift+5')}</td><td>Toolbar with every mode, a timer and save options</td><td>Wherever Options → Save to points</td></tr>
<tr><td>Add ${k('Control')} to any of the above</td><td>The same capture</td><td>Clipboard only, no file</td></tr>
<tr><td>A Chrome extension</td><td>Web pages: full page, an area, an element</td><td>Downloads, or the clipboard</td></tr>
</tbody>
</table>
<p>If you use a Windows keyboard with your Mac, the Windows key acts as ${k('Cmd')} and ${k('Alt')} acts as ${k('Option')}, so the same shortcuts work with different labels.</p>`,
      },
      {
        id: 'clipboard',
        h: 'How to copy a screenshot instead of saving it',
        html: `<p>Add ${k('Control')} to any screenshot shortcut and the Mac copies the image to the clipboard instead of saving a file:</p>
<ul>
<li>${k('Cmd+Control+Shift+3')} copies the whole screen.</li>
<li>${k('Cmd+Control+Shift+4')} copies an area you drag.</li>
<li>${k('Cmd+Control+Shift+4')}, then ${k('Space')}, copies a window.</li>
</ul>
<p>Then click into an email, a document or a chat and paste with ${k('Cmd+V')}. If you almost always paste screenshots rather than keep them, set <strong>Options → Save to → Clipboard</strong> in the ${k('Cmd+Shift+5')} toolbar and the plain shortcuts will copy too.</p>
<p>The floating thumbnail is another shortcut people miss: drag it straight from the corner of the screen into a message, a document or a Finder folder. Our guide on <a href="/blog/how-to-copy-a-screenshot-to-the-clipboard">copying a screenshot to the clipboard</a> covers pasting into different apps and what to know about clipboard sharing between your Apple devices.</p>`,
      },
      {
        id: 'where-saved',
        h: 'Where do screenshots go on a Mac, and how to change it',
        html: `<p>By default, screenshots are saved to the <strong>desktop</strong> as PNG files named with the date and time, such as <code>Screenshot 2026-11-16 at 10.24.31.png</code>. A busy week can bury your desktop in them, so many people move them somewhere else:</p>
<ol>
<li><strong>Create a folder</strong> for them, for example <strong>Screenshots</strong> inside Documents or Pictures.</li>
<li><strong>Press ${k('Cmd+Shift+5')}</strong> and click <strong>Options</strong>.</li>
<li><strong>Choose Other Location</strong> and pick the new folder.</li>
</ol>
<p>From then on, every screenshot goes there, whichever shortcut you use. If you’ve turned on <strong>Desktop &amp; Documents Folders</strong> in iCloud Drive, screenshots saved to either place sync to your other Apple devices too, which is convenient, and worth remembering when a screenshot shows something private.</p>
<p>To save as JPEG instead of PNG, which makes smaller files for photos but blurs text slightly, open Terminal and run <code>defaults write com.apple.screencapture type jpg</code>. Use <code>png</code> in the same command to switch back. If the change doesn’t take effect straight away, log out and back in.</p>
<p>Once you’ve got a folder full of captures, <a href="/blog/how-to-organize-screenshots">how to organize screenshots</a> has a simple system for naming and sorting them.</p>`,
      },
      {
        id: 'markup',
        h: 'Marking up a screenshot with the floating thumbnail',
        html: `<p>Click the thumbnail that appears after a capture and the screenshot opens in a Markup window. There you can crop, draw, add shapes, text and arrows, and highlight parts of the image. Click <strong>Done</strong> to save the changes, or the trash icon to throw the screenshot away.</p>
<p>A few other moves work on the thumbnail itself:</p>
<ul>
<li><strong>Swipe it to the right</strong> to save immediately without waiting.</li>
<li><strong>Control-click it</strong> for a menu that lets you save to a different place, open the file in an app or delete it.</li>
<li><strong>Drag it</strong> into any app or folder.</li>
</ul>
<p>Markup is fine for a circle and a word or two. For screenshots that explain a process or a bug, numbered steps, consistent arrows and proper redaction save a lot of back-and-forth; see <a href="/blog/how-to-annotate-a-screenshot">how to annotate a screenshot</a>.</p>`,
      },
      {
        id: 'chrome',
        h: 'How to screenshot a full web page in Chrome on a Mac',
        html: `<p>The Mac’s shortcuts capture only what’s on the screen. For a whole web page, top to bottom, you need Chrome’s DevTools or an extension. <a href="/">FrameShot, our screenshot and screen recording extension for Chrome</a>, works the same on a Mac as anywhere else:</p>
<ol>
<li><strong>Add FrameShot to Chrome</strong> and pin it with the puzzle icon in the toolbar.</li>
<li><strong>Open the page</strong> you want to capture.</li>
<li><strong>Press ${k('Option+Shift+F')}</strong>, or click the FrameShot icon and choose <strong>Full page</strong>.</li>
<li><strong>Stay on the tab</strong> while it scrolls and captures. ${k('Esc')} cancels.</li>
<li><strong>Edit and export.</strong> The capture opens in the editor, where you can crop, annotate and redact, then download it as PNG, JPEG, WebP or PDF, or copy it to the clipboard.</li>
</ol>
<p>The same popup has <strong>Visible area</strong>, <strong>Selected area</strong> (scroll while selecting to go past the bottom of the screen), <strong>Element</strong> for one exact block of the page and <strong>Scrolling panel</strong> for chats and side panels. On a Retina display, captures are made at the screen’s full resolution, so text stays sharp. Captures stay in your browser; nothing is uploaded.</p>
<p>Without an extension, open DevTools with ${k('Cmd+Option+I')}, press ${k('Cmd+Shift+P')}, type <code>screenshot</code> and choose <strong>Capture full size screenshot</strong>. It works well on simple pages. <a href="/blog/how-to-take-a-screenshot-in-chrome">How to screenshot in Chrome</a> compares both approaches, and <a href="/blog/how-to-take-a-full-page-screenshot-in-chrome">full-page screenshots in Chrome</a> covers sticky headers and very long pages.</p>`,
      },
      {
        id: 'faq',
        h: 'Common questions',
        html: `<h3>Why isn’t my screenshot on the desktop?</h3>
<p>Check <strong>Options → Save to</strong> in the ${k('Cmd+Shift+5')} toolbar; it may point to another folder or to the clipboard. If you pressed ${k('Control')} as part of the shortcut, the screenshot was copied, not saved. And if the desktop syncs with iCloud, the file may still be downloading.</p>
<h3>How do I take a screenshot on a Mac without the keyboard?</h3>
<p>Open the <strong>Screenshot</strong> app from <strong>Applications → Utilities</strong>, or search for it with Spotlight. It opens the same toolbar as ${k('Cmd+Shift+5')}.</p>
<h3>Can a Mac take a scrolling screenshot?</h3>
<p>Not with the built-in tools. For web pages in Chrome, use an extension’s full-page or scrolling-panel mode. Our guide on <a href="/blog/how-to-take-a-scrolling-screenshot">scrolling screenshots</a> covers the options.</p>
<h3>How do I set a timer for a Mac screenshot?</h3>
<p>Press ${k('Cmd+Shift+5')}, click <strong>Options</strong> and choose 5 or 10 seconds under <strong>Timer</strong>, then click <strong>Capture</strong>. The countdown gives you time to open a menu or hover over something.</p>
<h3>How do I screenshot on a Mac with a Windows keyboard?</h3>
<p>Use the Windows key in place of ${k('Cmd')}: Windows key, ${k('Shift')} and ${k('4')} together captures an area.</p>`,
      },
    ],
  },

  'how-to-take-a-delayed-screenshot': {
    intro: `<p>To take a delayed screenshot, set a timer before you capture. On Windows, open the Snipping Tool app and choose a delay; on a Mac, press ${k('Cmd+Shift+5')} and pick a timer under <strong>Options</strong>. In Chrome, FrameShot can wait 3, 5 or 10 seconds before capturing the visible part of a page.</p>
<p>The delay gives you time to open a menu, hover over a button or trigger a tooltip that would vanish the moment you pressed a shortcut. Here’s how to set it up on each system, how long to wait, and a few tricks for menus that refuse to stay open.</p>`,
    sections: [
      {
        id: 'why-delay',
        h: 'Why use a screenshot timer?',
        html: `<p>Plenty of things on screen only exist while you’re interacting with them. Press a key or click a button to take a screenshot, and they disappear before the capture happens. A timer separates the two: you start the countdown, set up the screen, and the capture happens on its own.</p>
<p>A delay is the easy way to capture:</p>
<ul>
<li><strong>Drop-down and right-click menus</strong>, which close as soon as focus moves elsewhere.</li>
<li><strong>Hover states</strong>, such as a button changing colour or a card lifting when the pointer is over it.</li>
<li><strong>Tooltips</strong> and small help bubbles that appear after the pointer rests on something.</li>
<li><strong>Autocomplete suggestions</strong> under a search box or a form field.</li>
<li><strong>Short animations or toasts</strong>, like a “Saved” message that fades after a few seconds.</li>
<li><strong>Setting up by hand</strong>: switching to the right window, scrolling to the right spot or clicking into a field before the capture.</li>
</ul>
<p>If you write help articles, bug reports or training material, you’ll hit at least one of these every week. Knowing where the timer is saves a lot of retries.</p>`,
      },
      {
        id: 'windows',
        h: 'How to take a delayed screenshot on Windows',
        html: `<p>The ${k('Win+Shift+S')} shortcut has no timer, but the Snipping Tool app does:</p>
<ol>
<li><strong>Open Snipping Tool</strong> from the Start menu: press ${k('Win')}, type <em>Snipping Tool</em> and open it.</li>
<li><strong>Make sure it’s in screenshot mode</strong>, not video recording. On Windows 11 that’s the camera button at the top.</li>
<li><strong>Choose a mode</strong>: rectangle, window, full screen or freeform.</li>
<li><strong>Pick a delay</strong> from the menu next to the mode, usually shown as a clock or <em>No delay</em>. Recent versions offer 3, 5 and 10 seconds.</li>
<li><strong>Click New.</strong> The countdown starts. Open your menu or hover over the element while it runs.</li>
<li><strong>Make your selection.</strong> When time is up, the screen freezes and dims. Whatever was showing at that moment, including the open menu, is frozen in place, so you can drag your rectangle calmly.</li>
</ol>
<p>That frozen screen is the key detail: the menu doesn’t have to stay open while you select, only at the moment the countdown ends. On Windows 10, the older Snipping Tool has a <strong>Delay</strong> menu with a few seconds to choose from, and depending on your version, the snipping app may offer “Snip in 3 seconds” and “Snip in 10 seconds” under its <strong>New</strong> button instead.</p>
<p>The full set of Windows shortcuts, and where each one saves, is in <a href="/blog/how-to-screenshot-on-windows">how to screenshot on Windows</a>.</p>`,
      },
      {
        id: 'mac',
        h: 'How to take a delayed screenshot on a Mac',
        html: `<p>On a Mac, the timer lives in the screenshot toolbar:</p>
<ol>
<li><strong>Press ${k('Cmd+Shift+5')}.</strong> The toolbar appears at the bottom of the screen.</li>
<li><strong>Choose a mode</strong>: entire screen, a window or a selected portion. For a portion, set the box over the area first.</li>
<li><strong>Click Options</strong> and choose <strong>5 seconds</strong> or <strong>10 seconds</strong> under <strong>Timer</strong>.</li>
<li><strong>Click Capture.</strong> A countdown appears. Open the menu or hover over the element before it reaches zero.</li>
</ol>
<p>The toolbar remembers the timer the next time you open it, so set it back to <strong>None</strong> when you’re done if you don’t want to wait every time.</p>
<p>If you’re comfortable with Terminal, the <code>screencapture</code> command accepts any delay in seconds. <code>screencapture -T 3 ~/Desktop/menu.png</code> waits three seconds and then saves the whole screen to your desktop, which is handy when 5 seconds feels too long. Add <code>-c</code> to copy the result to the clipboard instead of saving a file.</p>
<p>More Mac shortcuts and options are in <a href="/blog/how-to-screenshot-on-a-mac">how to screenshot on a Mac</a>.</p>`,
      },
      {
        id: 'chrome',
        h: 'How to take a delayed screenshot in Chrome',
        html: `<p>When the menu or hover state you need is on a web page, a browser tool gives you a cleaner result: just the page, without the taskbar, the dock or the rest of your screen. <a href="/">FrameShot</a>, a screenshot and screen recording extension for Chrome, has a delay built into its <strong>Visible area</strong> capture:</p>
<ol>
<li><strong>Open the page</strong> and scroll to the part you want.</li>
<li><strong>Click the FrameShot icon</strong> in the toolbar.</li>
<li><strong>Choose a delay</strong> of 3, 5 or 10 seconds in the popup’s delay selector.</li>
<li><strong>Click Visible area.</strong> The popup closes and the countdown runs on the FrameShot icon in the toolbar.</li>
<li><strong>Open the menu or hover</strong> over the element, and keep the pointer still.</li>
<li><strong>Wait for the capture.</strong> When the countdown ends, FrameShot captures what’s visible in the tab, scrollbars trimmed, and opens it in the editor.</li>
</ol>
${fig('popup', 'FrameShot popup', 'The FrameShot popup listing the Visible area, Full page, Selected area and Element capture modes, with a Record screen button', 'Pick a delay, then choose Visible area and set up the page while it counts down.')}
<p>The delay applies to visible-area captures, and you set it from the popup. Full page, selected area and element captures start straight away; a full-page capture scrolls the page, which would close most menus anyway. If you need part of the page rather than the whole view, take the delayed capture and crop it in the editor afterwards.</p>`,
      },
      {
        id: 'how-long',
        h: 'How long should the delay be?',
        html: `<p>Shorter is usually better: the longer you wait, the more likely a notification pops up or your hand drifts. As a rough guide:</p>
<ul>
<li><strong>3 seconds</strong> for a single hover or a menu that’s one click away.</li>
<li><strong>5 seconds</strong> for a submenu, a right-click menu, or typing a few letters to show autocomplete.</li>
<li><strong>10 seconds</strong> when you need to switch windows, scroll or set up several things at once.</li>
</ul>
<table>
<thead><tr><th>Tool</th><th>Delay options</th><th>What it captures</th></tr></thead>
<tbody>
<tr><td>Snipping Tool (Windows 11)</td><td>3, 5 or 10 seconds on recent versions</td><td>Area, window, full screen or freeform, from a frozen screen</td></tr>
<tr><td>Snipping Tool (Windows 10)</td><td>A few seconds, depending on version</td><td>Area, window or full screen</td></tr>
<tr><td>${k('Cmd+Shift+5')} (Mac)</td><td>5 or 10 seconds</td><td>Entire screen, a window or a selected portion</td></tr>
<tr><td><code>screencapture -T</code> (Mac Terminal)</td><td>Any number of seconds</td><td>The entire screen</td></tr>
<tr><td>FrameShot (Chrome)</td><td>3, 5 or 10 seconds</td><td>The visible part of a web page, without browser controls</td></tr>
</tbody>
</table>`,
      },
      {
        id: 'stubborn-menus',
        h: 'Menus and tooltips that disappear anyway',
        html: `<p>Some menus close the moment the pointer moves or the window loses focus, even with a timer. A few habits help:</p>
<ul>
<li><strong>Keep your hands off.</strong> Once the menu is open, don’t click, scroll or press keys until the capture happens.</li>
<li><strong>Don’t switch apps.</strong> Many menus close when their window stops being the active one. Start the countdown from the same window if you can, or from the browser toolbar for web pages.</li>
<li><strong>Open the menu with the keyboard.</strong> Some apps let you open menus with ${k('Alt')} or ${k('F10')} on Windows, which avoids a stray click.</li>
<li><strong>Mute notifications.</strong> Turn on Do Not Disturb or Focus so a message doesn’t land on top of your menu.</li>
</ul>
<p>For web pages, Chrome’s DevTools can hold a state for you. Right-click the element, choose <strong>Inspect</strong>, then in the <strong>Styles</strong> pane click <strong>:hov</strong> and tick <strong>:hover</strong> or <strong>:focus</strong>. The element stays in that state until you untick it, so you can take your screenshot without any timer at all. If a menu is controlled by a script rather than styles, opening it and pausing the page from the <strong>Sources</strong> panel with ${k('F8')} often freezes it in place. Close or undock DevTools before you capture so the page has its normal width.</p>
${callout('Lightbulb', '<p>Capturing a menu as part of a how-to? Take a delayed screenshot of the open menu, then add a numbered step marker or an arrow pointing at the option to choose. The reader sees exactly where to click.</p>')}`,
      },
      {
        id: 'after',
        h: 'Cropping and annotating the result',
        html: `<p>A delayed capture usually shows more than you need: the whole screen or the whole visible page around one small menu. Before you share it, take a minute to tidy it up:</p>
<ul>
<li><strong>Crop</strong> to the menu and a little context around it, so the reader knows where it lives.</li>
<li><strong>Point at the option</strong> that matters with an arrow, a box or a numbered marker. <a href="/blog/how-to-annotate-a-screenshot">How to annotate a screenshot</a> covers the marks that read best.</li>
<li><strong>Hide anything private</strong> that was on screen during the countdown, such as names in a sidebar or an email in the corner. Use a solid box for anything secret; see <a href="/blog/how-to-blur-or-redact-sensitive-information-in-screenshots">how to redact screenshots</a>.</li>
<li><strong>Copy or download.</strong> Paste it straight into a chat or a ticket, or save it as a file. <a href="/blog/how-to-copy-a-screenshot-to-the-clipboard">Copying a screenshot to the clipboard</a> explains when each makes sense.</li>
</ul>
<p>If you only ever need part of a page, <a href="/blog/how-to-screenshot-part-of-a-web-page">how to screenshot part of a web page</a> shows the selected-area and element captures, which skip the cropping step entirely when you don’t need an open menu.</p>`,
      },
      {
        id: 'faq',
        h: 'Common questions',
        html: `<h3>Does Win+Shift+S have a delay option?</h3>
<p>No. The shortcut captures straight away. For a timer, open the Snipping Tool app from the Start menu and choose a delay before clicking <strong>New</strong>.</p>
<h3>Can I set a 3-second timer on a Mac?</h3>
<p>The ${k('Cmd+Shift+5')} toolbar offers only 5 and 10 seconds. In Terminal, <code>screencapture -T 3</code> followed by a file name waits exactly three seconds. In Chrome, FrameShot’s visible-area capture offers 3 seconds too.</p>
<h3>How do I screenshot a drop-down menu?</h3>
<p>Start a delayed screenshot, open the menu while the countdown runs and keep the pointer still. On a Mac you can also open the menu, press ${k('Cmd+Shift+4')}, then ${k('Space')}, and click the menu to capture it on its own.</p>
<h3>Can FrameShot delay a full-page screenshot?</h3>
<p>The delay is for visible-area captures. A full-page capture scrolls through the page, which closes most menus and hover states anyway, so a delay wouldn’t keep them in the picture.</p>`,
      },
    ],
  },

  'how-to-copy-a-screenshot-to-the-clipboard': {
    intro: `<p>To copy a screenshot to the clipboard instead of saving a file, press ${k('Win+Shift+S')} on Windows, or add ${k('Control')} to the Mac shortcut, for example ${k('Cmd+Control+Shift+4')}. Then paste it anywhere with ${k('Ctrl+V')} or ${k('Cmd+V')}: an email, a document or a chat message.</p>
<p>Copying skips the folder of old files and is often the fastest way to share what’s on your screen. This guide covers the shortcuts on every system, where pasting works and where it doesn’t, how to copy a web page screenshot after you’ve marked it up, and what to know about clipboard history before you copy anything private.</p>`,
    sections: [
      {
        id: 'windows',
        h: 'How to copy a screenshot to the clipboard on Windows',
        html: `<p>Windows has three shortcuts that copy a screenshot:</p>
<ul>
<li><strong>${k('Win+Shift+S')}</strong> opens the snipping bar. Choose a rectangle, a window, the full screen or a freeform shape, and the capture goes straight to the clipboard. On recent versions of Windows 11, Snipping Tool also saves a copy in <strong>Pictures → Screenshots</strong>; switch that off in its settings if you only want the clipboard.</li>
<li><strong>${k('Alt+PrtScn')}</strong> copies the active window, without the taskbar or the desktop behind it.</li>
<li><strong>${k('PrtScn')}</strong> copies the entire screen on Windows 10 and older setups. On recent Windows 11 it opens the snipping bar instead, which ends up in the same place.</li>
</ul>
<p>${k('Win+PrtScn')} is the odd one out: it’s the shortcut for saving a file automatically. If you’ve opened a screenshot in the Snipping Tool app, its copy button (or ${k('Ctrl+C')}) puts the edited version on the clipboard.</p>
<p>The full list, including the Game Bar and where each method saves, is in <a href="/blog/how-to-screenshot-on-windows">how to screenshot on Windows</a>.</p>`,
      },
      {
        id: 'mac',
        h: 'How to copy a screenshot to the clipboard on a Mac',
        html: `<p>On a Mac, the trick is the ${k('Control')} key. Add it to any screenshot shortcut and the image is copied instead of saved:</p>
<ol>
<li><strong>Press ${k('Cmd+Control+Shift+4')}</strong> and drag over the area you want. For the whole screen use ${k('Cmd+Control+Shift+3')}; for one window, press ${k('Space')} after the shortcut and click the window.</li>
<li><strong>Click where you want the screenshot</strong>: a message, an email or a document.</li>
<li><strong>Paste</strong> with ${k('Cmd+V')}.</li>
</ol>
<p>If you almost never keep screenshots as files, make copying the default. Press ${k('Cmd+Shift+5')}, click <strong>Options</strong> and choose <strong>Clipboard</strong> under <strong>Save to</strong>. From then on, the ordinary ${k('Cmd+Shift+3')} and ${k('Cmd+Shift+4')} copy too.</p>
<p>There’s also a way that doesn’t involve the clipboard at all: after a normal screenshot, drag the floating thumbnail from the corner of the screen straight into the app you want. More Mac tricks are in <a href="/blog/how-to-screenshot-on-a-mac">how to screenshot on a Mac</a>.</p>`,
      },
      {
        id: 'shortcuts',
        h: 'Clipboard screenshot shortcuts at a glance',
        html: `<table>
<thead><tr><th>System</th><th>Copy an area</th><th>Copy the whole screen</th><th>Also saves a file?</th></tr></thead>
<tbody>
<tr><td>Windows 11</td><td>${k('Win+Shift+S')}</td><td>${k('PrtScn')}, or Full screen in the snipping bar</td><td>Snipping Tool captures do on recent versions, unless switched off</td></tr>
<tr><td>Windows 10</td><td>${k('Win+Shift+S')}</td><td>${k('PrtScn')}</td><td>No</td></tr>
<tr><td>macOS</td><td>${k('Cmd+Control+Shift+4')}</td><td>${k('Cmd+Control+Shift+3')}</td><td>No</td></tr>
<tr><td>ChromeOS</td><td>${k('Ctrl+Shift+Show windows')}</td><td>${k('Ctrl+Show windows')}</td><td>Yes, in Downloads</td></tr>
<tr><td>Chrome, with FrameShot</td><td>Selected area or Element, then Copy</td><td>Visible area or Full page, then Copy</td><td>Kept in the FrameShot library; download only if you want a file</td></tr>
</tbody>
</table>
<p>On a Chromebook, every screenshot is copied and saved at the same time, so there’s nothing extra to press; see <a href="/blog/how-to-screenshot-on-a-chromebook">how to screenshot on a Chromebook</a>. On Linux it depends on your desktop; on recent versions of GNOME, the screenshot tool both saves the image and copies it.</p>`,
      },
      {
        id: 'where-to-paste',
        h: 'Where can you paste a screenshot?',
        html: `<p>Most places that accept images accept a pasted one. A few behave in ways worth knowing:</p>
<ul>
<li><strong>Chat apps.</strong> Click into the message box and paste. Most show a preview before you send, where you can add a line of text. Some apps recompress images to save space, so tiny text can come out softer than in the original.</li>
<li><strong>Email.</strong> In most webmail and desktop mail apps, a pasted screenshot appears inline in the message body. Some recipients’ apps show inline images as attachments instead. If the image must arrive untouched, attach the file.</li>
<li><strong>Documents and slides.</strong> Word processors, slide apps and online editors paste the image where your cursor is, ready to resize.</li>
<li><strong>Image editors.</strong> Paste into an editor to crop or mark it up. On a Mac, Preview’s <strong>File → New from Clipboard</strong> turns the clipboard into a new image you can save.</li>
<li><strong>Bug trackers and web forms.</strong> Many let you paste straight into a comment box. Others only accept an uploaded file, in which case you need to save it first.</li>
</ul>
<p>What you can’t do is paste a screenshot into File Explorer or Finder to create a file. To turn a clipboard image into a file, paste it into an image app and save it, or paste it into the FrameShot library, which imports pasted images so you can edit, organise and export them.</p>`,
      },
      {
        id: 'chrome',
        h: 'How to copy a screenshot of a web page in Chrome',
        html: `<p>System shortcuts copy whatever’s on screen, browser controls and all. When the screenshot is of a web page, especially one longer than the screen, a browser tool gives you a cleaner image you can mark up before you copy. With <a href="/">FrameShot, a screenshot and screen recording extension for Chrome</a>, it takes three steps:</p>
<ol>
<li><strong>Capture the page.</strong> Click the FrameShot icon and choose <strong>Visible area</strong>, <strong>Full page</strong>, <strong>Selected area</strong> or <strong>Element</strong>, or use a shortcut such as ${k('Alt+Shift+F')} for the full page (${k('Option+Shift+F')} on a Mac).</li>
<li><strong>Edit it if you need to.</strong> The capture opens in the editor. Crop it, add an arrow or a note, and cover anything private.</li>
<li><strong>Click Copy.</strong> The finished image, with your annotations and redactions in it, goes onto the clipboard as a PNG. Paste it wherever you need it.</li>
</ol>
<p>You can also copy any earlier screenshot from the library: open the menu on its card and choose <strong>Copy image</strong>. The composer, which places a screenshot on a background with padding and a browser frame, has its own copy button too.</p>
<p>The copy is a PNG, which keeps text and interface edges sharp. Blur, pixelation and solid redaction are flattened into the copied pixels, so what’s hidden in the editor is hidden in what you paste. Nothing is uploaded on the way: the image goes from FrameShot to your system clipboard and nowhere else.</p>
${callout('Info', '<p>Very tall full-page screenshots make very large images. Some apps shrink or refuse huge pasted images, so for a long page, download it as a PNG or PDF and attach the file instead.</p>')}`,
      },
      {
        id: 'copy-or-download',
        h: 'Should you copy or download a screenshot?',
        html: `<p>Both have their place. <strong>Copy</strong> when:</p>
<ul>
<li>You’re sharing one screenshot right now, in a chat, a comment or an email you’re writing.</li>
<li>You’re building a document or slide deck and pasting images as you go.</li>
<li>You don’t need to keep the image afterwards.</li>
</ul>
<p><strong>Download</strong> when:</p>
<ul>
<li>You want to keep the screenshot, attach it to a ticket that needs a file, or share it later.</li>
<li>The image is very large, such as a long full-page capture.</li>
<li>You need a specific format: JPEG or WebP for a smaller file, or a PDF for a receipt or an archive. <a href="/blog/how-to-save-a-web-page-as-a-pdf-or-image">How to save a web page as a PDF or image</a> explains the differences.</li>
<li>You’re sending several screenshots at once. FrameShot can export a selection as a ZIP archive or as one combined PDF.</li>
</ul>
<p>With FrameShot you don’t have to choose up front: captures stay in its library, so you can copy one now and download it later. If those captures start to pile up, <a href="/blog/how-to-organize-screenshots">how to organize screenshots</a> shows how to keep them tidy.</p>`,
      },
      {
        id: 'privacy',
        h: 'Clipboard history and privacy',
        html: `<p>The clipboard feels temporary, but it doesn’t always forget. Before you copy a screenshot of something sensitive, it helps to know where copies can end up:</p>
<ul>
<li><strong>Windows clipboard history.</strong> Once you turn it on with ${k('Win+V')}, Windows keeps a list of recent copies, images included. If <strong>Sync across your devices</strong> is switched on in <strong>Settings → System → Clipboard</strong>, those copies can reach your other signed-in devices too. Open ${k('Win+V')} and choose <strong>Clear all</strong> to wipe the list.</li>
<li><strong>Apple devices.</strong> With Handoff on, Universal Clipboard lets you copy on a Mac and paste on a nearby iPhone or iPad signed into the same Apple Account, and the other way round. Recent versions of macOS also add a clipboard history to Spotlight; if you use it, screenshots you copy can show up there too.</li>
<li><strong>Chromebooks.</strong> ChromeOS keeps a short clipboard history, opened with ${k('Launcher+V')} (${k('Search+V')} on older keyboards).</li>
<li><strong>Clipboard managers and remote desktops.</strong> Third-party clipboard tools save everything you copy, and remote desktop sessions often share the clipboard between computers.</li>
</ul>
<p>The safest habit is to redact before you copy rather than after you paste. Cover passwords, card numbers, emails and customer names with a solid box first; our guide on <a href="/blog/how-to-blur-or-redact-sensitive-information-in-screenshots">blurring and redacting screenshots</a> explains why a solid box is safer than blur for short text. FrameShot itself keeps captures on your device and only puts an image on the clipboard when you click Copy; <a href="/blog/why-frameshot-keeps-your-screenshots-on-your-device">here’s how its privacy works</a>.</p>
${callout('ShieldCheck', '<p>Pasting into a website shares the image with that website, just like uploading a file. Paste sensitive screenshots only into tools you trust with that information.</p>')}`,
      },
      {
        id: 'faq',
        h: 'Common questions',
        html: `<h3>Why can’t I paste my screenshot?</h3>
<p>Usually because something else was copied after it, the app doesn’t accept pasted images, or the screenshot was cancelled. Take it again, paste it straight away, and if the app still refuses, save it as a file and attach it.</p>
<h3>How do I save a screenshot from the clipboard as a file?</h3>
<p>Paste it into an image app and save from there. On a Mac, Preview’s <strong>File → New from Clipboard</strong> does it in one step. You can also paste it into the FrameShot library and download it in the format you want.</p>
<h3>Does copying a screenshot lower its quality?</h3>
<p>The copy itself doesn’t: FrameShot copies a PNG, which is lossless, and system shortcuts copy the image at full resolution. The app you paste into may compress or shrink it, though, especially chat apps and very large images.</p>
<h3>How do I copy a full-page screenshot?</h3>
<p>Capture it with a full-page tool such as FrameShot, then click <strong>Copy</strong> in the editor. For very long pages, downloading a PNG or PDF is more reliable than pasting.</p>`,
      },
    ],
  },

  'how-to-make-screenshots-look-professional': {
    intro: `<p>To make screenshots look professional, start with a clean capture, crop it tightly to one idea and keep sizes consistent across a set. Then place it on a simple background with some padding, rounded corners and a soft shadow. A light or dark browser frame makes a web page look like a finished product shot, and a few annotations in one colour do the rest.</p>
<p>None of this needs design software. Below are the habits that make the biggest difference, the canvas sizes that suit slides, link previews and social posts, and a worked example using FrameShot’s composer in Chrome.</p>`,
    sections: [
      {
        id: 'clean-capture',
        h: 'Start with a clean capture',
        html: `<p>Polish starts before you press a shortcut. Most screenshots that look amateur have the same problems: personal clutter, cookie banners and a window that’s too wide or too narrow. A minute of preparation fixes all three:</p>
<ul>
<li><strong>Use demo data.</strong> Swap real names, emails and numbers for realistic sample content. It looks tidier and avoids redaction boxes later.</li>
<li><strong>Clear the page.</strong> Dismiss cookie banners, chat widgets, “new feature” popups and notifications.</li>
<li><strong>Capture the page, not the screen.</strong> A browser tool captures only the web page, without your taskbar, dock, bookmarks bar or other tabs.</li>
<li><strong>Pick a sensible window size.</strong> Very wide windows leave large empty margins on many sites. Something close to a typical laptop width usually looks most natural.</li>
<li><strong>Zoom for legibility.</strong> If the result will be shown small, such as on a slide or in a social post, zoom the page in a step or two with ${k('Ctrl')}+<kbd>+</kbd> (${k('Cmd')}+<kbd>+</kbd> on a Mac) before you capture, so text is still readable.</li>
<li><strong>Use a high-resolution display if you have one.</strong> Captures on a Retina or other high-density screen have twice the pixels, which keeps text crisp when the image is scaled down.</li>
</ul>
<p>For a single component, such as a pricing table or a signup form, capture just that element rather than cropping a full screenshot later. <a href="/blog/how-to-screenshot-part-of-a-web-page">How to screenshot part of a web page</a> shows how to capture an element exactly to its edges.</p>`,
      },
      {
        id: 'crop',
        h: 'Crop tightly to one idea',
        html: `<p>Every screenshot should make one point. If you find yourself adding three arrows to explain three different things, you probably need three screenshots.</p>
<ul>
<li><strong>Cut what doesn’t help.</strong> Crop away sidebars, footers and empty space that have nothing to do with the point.</li>
<li><strong>Leave a little context.</strong> Keep enough of the surroundings that people know where they are, such as the page header above a form.</li>
<li><strong>Crop on clean lines.</strong> Cut along the edges of panels and cards rather than through the middle of text or buttons.</li>
<li><strong>Use an aspect ratio when the destination has one.</strong> A 16:9 crop fits slides and video, 1:1 fits square posts. FrameShot’s editor has free crop plus 1:1, 4:3, 16:9 and 9:16 presets.</li>
<li><strong>Scale down, never up.</strong> Enlarging a small screenshot makes it blurry. If you need a bigger image, capture again with the page zoomed in.</li>
</ul>`,
      },
      {
        id: 'consistency',
        h: 'Keep sizes and styles consistent',
        html: `<p>One polished screenshot looks good. A set of screenshots that match looks professional. Whether it’s a help centre, a product page or a slide deck, consistency is what readers notice without realising it:</p>
<ul>
<li><strong>Same window size</strong> for every capture in a series, so interface elements appear at the same scale.</li>
<li><strong>Same zoom level</strong> and the same theme. Don’t mix light and dark mode in one article unless you’re comparing them.</li>
<li><strong>Same canvas, background and padding</strong> when you frame them.</li>
<li><strong>Same annotation style</strong>: one colour, one arrow thickness, one font size.</li>
<li><strong>Same file format and naming.</strong> A naming pattern such as the site and date makes a set easy to manage. FrameShot’s filename templates can do that automatically, with fields such as <code>{domain}</code>, <code>{title}</code> and <code>{date}</code>.</li>
</ul>
<p>Keeping a project’s captures together helps too. <a href="/blog/how-to-organize-screenshots">How to organize screenshots</a> shows how to group them with collections and tags.</p>`,
      },
      {
        id: 'background-frame',
        h: 'Add a background, padding, rounded corners and a shadow',
        html: `<p>A raw screenshot dropped onto a white page has no edge: it’s hard to tell where the interface ends and the page begins. This is what people usually mean when they talk about beautifying a screenshot: giving it a frame of its own. Four simple touches do most of the work:</p>
<ul>
<li><strong>Background.</strong> A solid colour or a gentle gradient behind the screenshot separates it from the page. Brand colours work well; so do quiet neutrals. Keep the background calmer than the screenshot so it doesn’t compete.</li>
<li><strong>Padding.</strong> Space between the screenshot and the edge of the canvas is what makes it look deliberate. Too little looks cramped; too much makes the screenshot tiny.</li>
<li><strong>Rounded corners.</strong> A modest radius softens the hard rectangle and matches how most apps and websites look today.</li>
<li><strong>Shadow.</strong> A soft, slightly offset shadow lifts the screenshot off the background. Keep it subtle: a heavy, dark shadow looks dated.</li>
</ul>
<p>For web pages, a <strong>browser frame</strong> adds one more layer of polish: a simple window bar with the site’s address makes the image read instantly as “this is a website”. Pick a light frame for light pages and a dark one for dark pages. When the screenshot will sit on a website or slide with its own background, a transparent canvas lets that background show through around the frame.</p>`,
      },
      {
        id: 'composer',
        h: 'Worked example: polishing a screenshot in FrameShot’s composer',
        html: `<p><a href="/">FrameShot, our screenshot and screen recording extension for Chrome</a>, includes a composer that does all of the above in one screen. Here’s how to turn a plain capture of a product page into a link-preview image:</p>
<ol>
<li><strong>Capture the page.</strong> Use <strong>Element</strong> to grab one section exactly to its edges, or <strong>Visible area</strong> for the whole view.</li>
<li><strong>Tidy it in the editor.</strong> Crop if needed, add an arrow or a numbered step, and cover anything private with a solid redaction box.</li>
<li><strong>Click Compose.</strong> It’s in the editor’s toolbar, and in the menu on each screenshot in the library.</li>
<li><strong>Choose a canvas.</strong> Pick <strong>1200×630</strong> for a link preview. Other presets include fit to screenshot, 16:9, 4:3, 1:1, 4:5, 9:16, 1920×1080 and a custom size with aspect lock.</li>
<li><strong>Set the background.</strong> Choose a solid colour, one of the gradient presets or your own colours and angle, or a transparent background.</li>
<li><strong>Adjust padding, corner radius and shadow.</strong> The shadow has its own blur, offset and opacity, so you can keep it soft.</li>
<li><strong>Add a browser frame</strong> if it’s a web page, light or dark, with the site’s domain in the address bar.</li>
<li><strong>Position the screenshot.</strong> Fit it, fill the canvas, or set a custom scale, and align it to any of nine positions. Aligning it to the bottom, for example, lets it run off the edge for a modern product-shot look.</li>
<li><strong>Export.</strong> Download the image, copy it to the clipboard, or save the composition to the library.</li>
</ol>
${fig('composer', 'FrameShot Studio — Composer', 'A product page screenshot on a gradient background with padding, rounded corners, a soft shadow and a light browser frame in the FrameShot composer', 'Background, padding, corners, shadow and a browser frame, all in one place.')}
<p>Nothing is uploaded at any point, and no watermark is added to the result. The same steps work for screenshots you didn’t take with FrameShot: drag or paste an image into the library first, then open it in the composer.</p>`,
      },
      {
        id: 'sizes',
        h: 'Which size for slides, social posts and link previews?',
        html: `<p>The right canvas depends on where the image will be seen. These are common starting points; platforms change their recommended sizes from time to time, so check the current guidance for anything important.</p>
<table>
<thead><tr><th>Where it’s going</th><th>Canvas</th><th>Tip</th></tr></thead>
<tbody>
<tr><td>Slides and video</td><td>16:9, or 1920×1080</td><td>Use generous padding so the screenshot isn’t lost behind a presenter or captions</td></tr>
<tr><td>Link previews and blog headers</td><td>1200×630</td><td>Previews are shown small, so crop tightly and zoom the page in before capturing</td></tr>
<tr><td>Square feed posts</td><td>1:1</td><td>Works well for a single component or a mobile-sized view</td></tr>
<tr><td>Portrait feed posts</td><td>4:5</td><td>Takes up more of the screen in mobile feeds than a square</td></tr>
<tr><td>Stories and vertical video</td><td>9:16</td><td>Leave space at the top and bottom, where apps place their own controls</td></tr>
<tr><td>Docs, help articles and READMEs</td><td>Fit to screenshot, or 4:3</td><td>Keep the background subtle so it sits comfortably on the page</td></tr>
</tbody>
</table>
<p>If the screenshots are going into a talk or a recorded demo, <a href="/blog/how-to-record-a-presentation">how to record a presentation</a> covers the video side.</p>`,
      },
      {
        id: 'annotations',
        h: 'Annotations that look designed, not scribbled',
        html: `<p>Annotations are where a polished screenshot most often falls apart. A few rules keep them clean:</p>
<ul>
<li><strong>One accent colour.</strong> Pick a colour that stands out from the interface, often red, orange or a bright brand colour, and use it for every mark.</li>
<li><strong>Straight arrows and tidy boxes</strong> instead of freehand circles. Rounded rectangles look softer than square ones.</li>
<li><strong>Numbered steps</strong> for anything with an order. They’re easier to refer to in the text than “the arrow on the left”.</li>
<li><strong>Short labels with a background.</strong> A few words on a solid background stay readable on any part of the screenshot.</li>
<li><strong>Redact neatly.</strong> A solid box in a colour that matches the interface looks cleaner than heavy blur, and it’s safer for secrets.</li>
<li><strong>Less is more.</strong> Three marks are usually the limit before a screenshot gets busy.</li>
</ul>
<p>FrameShot’s editor has arrows, rounded rectangles, numbered step markers, text with a background and outline, and blur, pixelate and solid redaction. <a href="/blog/how-to-annotate-a-screenshot">How to annotate a screenshot</a> goes into the details, and <a href="/blog/how-to-blur-or-redact-sensitive-information-in-screenshots">how to blur or redact sensitive information</a> covers hiding data properly.</p>`,
      },
      {
        id: 'export',
        h: 'Export settings that keep it sharp',
        html: `<p>The last step can undo all the others if the format is wrong:</p>
<ul>
<li><strong>PNG for interfaces and text.</strong> It’s lossless, so edges and small type stay crisp, and it keeps a transparent background, which JPEG can’t.</li>
<li><strong>JPEG or WebP for photo-heavy pages</strong> or when file size matters. Keep the quality high; low settings blur text and add smudges around sharp edges.</li>
<li><strong>PDF for documents</strong> people will print or file. <a href="/blog/how-to-save-a-web-page-as-a-pdf-or-image">How to save a web page as a PDF or image</a> explains the options.</li>
<li><strong>Copy for quick shares.</strong> Pasting a finished composition straight into a chat or a document skips the file entirely; see <a href="/blog/how-to-copy-a-screenshot-to-the-clipboard">how to copy a screenshot to the clipboard</a>.</li>
</ul>
${callout('Lightbulb', '<p>Making a set? Finish one screenshot, then use the same composer settings for the rest. Consistency across a set matters more than any one perfect image.</p>')}`,
      },
      {
        id: 'faq',
        h: 'Common questions',
        html: `<h3>What does it mean to beautify a screenshot?</h3>
<p>It usually means placing a screenshot on a background with padding, rounded corners and a shadow, often inside a browser or device frame, so it looks like a finished image rather than a raw capture.</p>
<h3>What background works best for screenshots?</h3>
<p>A colour that contrasts gently with the screenshot: a soft gradient or brand colour for marketing images, a light neutral for documentation. Avoid busy backgrounds that compete with the interface.</p>
<h3>What size should a screenshot be for a blog post?</h3>
<p>Match the width of your content area, or twice that for high-resolution screens, and keep text readable at that width. For the article’s share image, 1200×630 is a common choice.</p>
<h3>Should I add a browser frame to screenshots?</h3>
<p>For marketing images, landing pages and social posts, a simple frame helps people recognise a website at a glance. In step-by-step documentation, a plain crop with a thin border or shadow is often enough.</p>
<h3>Can I make the background transparent?</h3>
<p>Yes. In FrameShot’s composer, choose the transparent background and download it as a PNG, so the screenshot sits on whatever page or slide you place it on.</p>`,
      },
    ],
  },
};
