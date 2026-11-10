/** Blog article bodies. Every product fact here matches the extension's code and FEATURES.md. */
import { icon, windowFrame } from '../layout.mjs';

const k = (keys) => keys.split('+').map((x) => `<kbd>${x}</kbd>`).join('+');
const callout = (ic, html) => `<div class="callout">${icon(ic, 20)}<div>${html}</div></div>`;
const fig = (name, title, alt, caption, dark) =>
  `<figure>${windowFrame(name, { title, alt, sizes: '(max-width: 780px) 92vw, 740px', dark })}<figcaption>${caption}</figcaption></figure>`;

export const BODIES = {
  'how-to-take-a-full-page-screenshot-in-chrome': {
    intro: `<p>A normal screenshot only shows what fits on your screen. Receipts, long articles, dashboards and landing pages rarely fit, and stitching several screenshots together by hand is slow and never quite lines up. Here are three ways to capture an entire web page in Google Chrome, what each one is good at, and how to deal with the pages that usually go wrong.</p>`,
    sections: [
      {
        id: 'why-its-hard',
        h: 'Why a normal screenshot isn’t enough',
        html: `<p>The screenshot keys built into your computer, such as ${k('Win+Shift+S')} on Windows or ${k('Cmd+Shift+4')} on a Mac, capture pixels that are on the screen right now. Anything below the fold simply isn’t there. A full-page screenshot has to scroll the page, take a picture of each part and join those parts without gaps or overlaps.</p>
<p>That is harder than it sounds. Modern pages have headers that stick to the top while you scroll, images that only load when they come into view, feeds that keep growing and app-style layouts where only an inner panel scrolls. A good full-page tool has to handle all of them, or you end up with a header repeated ten times and blank boxes where the images should be.</p>`,
      },
      {
        id: 'frameshot',
        h: 'Method 1: One click with FrameShot',
        html: `<p><a href="/">FrameShot</a> is a free Chrome extension that captures the whole page for you and opens the result in an editor. It needs no account and nothing is uploaded.</p>
<ol>
<li><strong>Add FrameShot to Chrome</strong> and pin it to the toolbar (click the puzzle icon, then the pin next to FrameShot).</li>
<li><strong>Open the page</strong> you want to capture.</li>
<li><strong>Click the FrameShot icon and choose Full page</strong>, or press ${k('Alt+Shift+F')} (${k('Option+Shift+F')} on a Mac).</li>
<li><strong>Wait a moment</strong> while FrameShot scrolls and captures. A progress bar shows how far it has got. Press ${k('Esc')} to cancel, or <strong>Stop &amp; save</strong> to keep what has been captured so far.</li>
<li><strong>Edit and export.</strong> The capture opens in the editor, where you can crop, annotate and blur, then download it as an image or a PDF, or copy it to the clipboard.</li>
</ol>
${fig('editor', 'FrameShot Studio — Editor', 'A long web page captured in one image and opened in the FrameShot editor', 'A full-page capture opens straight in the editor, ready to annotate.')}
<p>While it captures, FrameShot shows sticky headers once instead of on every slice, waits for lazy images to load, follows pages that keep loading more content, and captures the main panel of app-style pages that scroll inside a box. When it’s done it puts the page back exactly as it was, scroll position included. Your screenshot is made at your screen’s full sharpness, so text stays crisp on high-resolution displays.</p>`,
      },
      {
        id: 'devtools',
        h: 'Method 2: Chrome DevTools, no install needed',
        html: `<p>Chrome has a hidden full-page screenshot command in its developer tools. It’s handy when you can’t install anything:</p>
<ol>
<li>Open DevTools with ${k('F12')}, or ${k('Ctrl+Shift+I')} (${k('Cmd+Option+I')} on a Mac).</li>
<li>Open the Command Menu with ${k('Ctrl+Shift+P')} (${k('Cmd+Shift+P')} on a Mac).</li>
<li>Type <code>screenshot</code> and choose <strong>Capture full size screenshot</strong>.</li>
</ol>
<p>Chrome saves a PNG file to your Downloads folder. The command works by pretending the window is as tall as the page, which is fast but has side effects. Pages that scroll inside a panel usually come out as just the visible part, fixed headers and pop-ups can land in odd places, and images that load on scroll may be missing. There is no way to annotate or blur the result either, so you’ll need another app for that.</p>`,
      },
      {
        id: 'print-to-pdf',
        h: 'Method 3: Print the page to PDF',
        html: `<p>Press ${k('Ctrl+P')} (${k('Cmd+P')} on a Mac), set the destination to <strong>Save as PDF</strong>, and under <strong>More settings</strong> switch on <strong>Background graphics</strong>. The text in the PDF stays selectable, which is great for saving an article to read later.</p>
<p>It isn’t a screenshot, though. Printing uses the site’s print layout, so columns, menus and images often move or disappear, and the page is cut into paper-sized sheets, sometimes in the middle of a table or a picture. If you need the page to look exactly like it does on screen, capture it as an image instead. FrameShot can still give you a PDF of that image, split across A4 or Letter pages or as one long page.</p>`,
      },
      {
        id: 'comparison',
        h: 'Which method should you use?',
        html: `<table>
<thead><tr><th></th><th>FrameShot</th><th>DevTools</th><th>Print to PDF</th></tr></thead>
<tbody>
<tr><th>How to start</th><td>One click, or ${k('Alt+Shift+F')}</td><td>Open DevTools, run a command</td><td>Print dialog and settings</td></tr>
<tr><th>Looks like the screen</th><td>Yes</td><td>Usually</td><td>Often changes the layout</td></tr>
<tr><th>Pages that scroll inside a panel</th><td>Captured</td><td>Visible part only</td><td>Depends on the site</td></tr>
<tr><th>Annotate and blur</th><td>Built in</td><td>No</td><td>No</td></tr>
<tr><th>What you get</th><td>Image or PDF, or the clipboard</td><td>PNG file</td><td>PDF file</td></tr>
</tbody>
</table>
<p>For a quick one-off on a simple page, DevTools is fine. For anything you’ll share, document or mark up, an extension that understands sticky headers and lazy loading saves a lot of retakes.</p>`,
      },
      {
        id: 'tricky-pages',
        h: 'Tips for tricky pages',
        html: `<ul>
<li><strong>Cookie banners and chat bubbles.</strong> Close them before you capture. FrameShot’s settings also let you choose how fixed elements are handled: the smart default keeps headers at the top and footers at the bottom, or you can keep or hide them everywhere.</li>
<li><strong>Endless feeds.</strong> Social feeds and search results keep loading as you scroll. FrameShot follows them up to the maximum height set in its settings. Use <strong>Stop &amp; save</strong> when you have enough.</li>
<li><strong>Very long pages.</strong> Browsers limit how big a single image can be. Instead of cutting the page off, FrameShot splits it into numbered parts at full resolution, or scales it into one image if you prefer that in the settings.</li>
<li><strong>Web apps with a side panel.</strong> When only part of a page scrolls, as in many mail and project tools, choose <strong>Scrolling panel</strong> in the popup and click the area you want.</li>
<li><strong>Stay on the tab.</strong> Switching tabs, minimising the window or changing the zoom during a capture interrupts it. FrameShot notices and tells you, so you never save a broken image without knowing.</li>
<li><strong>Huge file sizes.</strong> A long page on a high-resolution screen is a lot of pixels. Export as JPEG or WebP, or as a compact PDF, when the file needs to be small.</li>
</ul>
${callout('Lightbulb', '<p>Some pages can’t be captured by any extension: Chrome’s own pages such as <code>chrome://settings</code>, the Chrome Web Store and other extensions’ pages. Chrome blocks them for security.</p>')}`,
      },
      {
        id: 'faq',
        h: 'Common questions',
        html: `<h3>Can I take a full-page screenshot in Chrome without an extension?</h3>
<p>Yes, with the <strong>Capture full size screenshot</strong> command in DevTools described above. It works well on simple pages and less well on pages with sticky headers, lazy images or inner scrolling panels.</p>
<h3>Why does my full-page screenshot show the header over and over?</h3>
<p>The header is “sticky”: it stays on screen while the page scrolls, so a tool that simply joins screenshots captures it in every slice. FrameShot detects sticky and fixed elements and shows them only where they belong.</p>
<h3>Can I capture just one part of a long page?</h3>
<p>Yes. Use <strong>Area</strong> and drag a box. If the part you need is taller than the screen, scroll while selecting and FrameShot extends the capture. Or use <strong>Element</strong> to capture a single block, like a table or a comment, exactly to its edges.</p>`,
      },
    ],
  },

  'how-to-record-your-screen-with-audio-in-chrome': {
    intro: `<p>Recording your screen in Chrome is easy. Recording it <em>with sound</em> trips up almost everyone the first time, because the sound depends on what you share and on one checkbox in Chrome’s dialog. This guide shows how to record a tab, a window or your whole screen with sound, your microphone and your webcam, and how to fix a recording that came out silent.</p>`,
    sections: [
      {
        id: 'what-to-share',
        h: 'Tab, window or entire screen: what to share',
        html: `<p>When a recording starts, Chrome opens its own share dialog with three choices. Which one you pick decides whether sound can be recorded at all:</p>
<table>
<thead><tr><th>You share</th><th>Sound you can record</th><th>Best for</th></tr></thead>
<tbody>
<tr><td><strong>A Chrome tab</strong></td><td>The tab’s own sound, on every system</td><td>Web app demos, videos, online lessons</td></tr>
<tr><td><strong>Entire screen</strong></td><td>Your computer’s sound on Windows and ChromeOS, and on macOS 14.2 or later with Chrome 141 or later</td><td>Switching between apps, desktop software</td></tr>
<tr><td><strong>A window</strong></td><td>None. Chrome never shares a window’s sound</td><td>Silent demos, or narration with your microphone</td></tr>
</tbody>
</table>
<p>Your microphone works with all three. If you only need to talk over what you show, any choice is fine.</p>`,
      },
      {
        id: 'steps',
        h: 'How to record your screen with FrameShot',
        html: `<ol>
<li><strong>Click the FrameShot icon and choose Record screen.</strong> The recorder opens in a new tab.</li>
<li><strong>Pick your sound and camera.</strong> Switch on the microphone and the tab or system sound, and the camera if you want a webcam bubble. A live meter shows that your microphone is picking you up.</li>
<li><strong>Choose quality and a countdown.</strong> 1080p at 30 frames per second suits most tutorials. The countdown gives you 3, 5 or 10 seconds to get ready, or none.</li>
<li><strong>Click Start recording.</strong> In Chrome’s dialog, pick a tab, a window or your entire screen, make sure the sound checkbox is on, and click <strong>Share</strong>.</li>
<li><strong>Record.</strong> The toolbar icon shows <code>REC</code>. Pause and resume as often as you like: the pauses are left out of the video.</li>
<li><strong>Stop</strong> from the recorder, the FrameShot popup or Chrome’s <strong>Stop sharing</strong> bar. The video opens in the player, ready to download.</li>
</ol>
${fig('recorder', 'FrameShot Studio — Recorder', 'The FrameShot recorder with a tab chosen, microphone and tab sound on, and a camera bubble preview', 'The recorder shows what will be recorded before you start.')}`,
      },
      {
        id: 'sound',
        h: 'Getting the sound right',
        html: `<p>Chrome, not the extension, decides what sound is shared, and it asks you in the share dialog:</p>
<ul>
<li><strong>Sharing a tab:</strong> keep <strong>Also share tab audio</strong> switched on. It’s next to the list of tabs.</li>
<li><strong>Sharing your entire screen:</strong> tick <strong>Also share system audio</strong>. On a Mac this needs macOS 14.2 or later and Chrome 141 or later. If the option isn’t there, share a tab instead.</li>
<li><strong>Sharing a window:</strong> there is no sound option. Choose a tab or your screen when sound matters.</li>
</ul>
<p>FrameShot asks Chrome to capture shared sound without the voice-call processing meant for video calls, where Chrome allows it, so music and video soundtracks keep their full range. If a recording starts without the sound you asked for, FrameShot shows a warning straight away with the reason and lets you discard it and try again, so you don’t find out after a twenty-minute take.</p>
${callout('Headphones', '<p>Recording your microphone and your computer’s sound at the same time? Wear headphones. Otherwise your microphone also picks up the sound from your speakers and the video has an echo.</p>')}`,
      },
      {
        id: 'webcam',
        h: 'Adding your webcam',
        html: `<p>Switch on the camera in the recorder and Chrome asks for permission the first time. Your face then appears in a round bubble in a corner of the video. You can choose the corner and the size, and change both while you record, so the bubble never covers the part of the screen you’re talking about.</p>
<p>The bubble is part of the video file itself. There’s no separate camera track to line up later, and the video looks the same wherever you share it.</p>`,
      },
      {
        id: 'quality',
        h: 'Choosing quality and frame rate',
        html: `<p>FrameShot records at 720p, 1080p, 1440p or 4K, at 15, 30 or 60 frames per second. Higher settings look sharper and smoother but make bigger files.</p>
<ul>
<li><strong>Tutorials and walkthroughs:</strong> 1080p at 30 fps is a good balance.</li>
<li><strong>Fast scrolling, animation and games:</strong> 60 fps keeps motion smooth.</li>
<li><strong>Small text or large monitors:</strong> 1440p or 4K keeps code and spreadsheets readable.</li>
<li><strong>Long recordings with little motion:</strong> 15 fps keeps files small.</li>
</ul>
<p>Videos are saved as MP4 when Chrome can record it, which plays almost everywhere, and as WebM otherwise.</p>`,
      },
      {
        id: 'after',
        h: 'After you stop recording',
        html: `<p>Your recording opens in FrameShot’s player and is saved in your library on your computer. From there you can play it, rename it, download it as a video file, save the current frame as a screenshot to annotate, or use <strong>Export GIF</strong> to turn a short part into a looping GIF. Nothing is uploaded, so sharing is up to you: attach the file to an email or a ticket, or drop it into your team chat.</p>
<p>Recordings are saved in small pieces while you record. If Chrome or your computer crashes mid-recording, open FrameShot again and it offers to recover what was recorded.</p>`,
      },
      {
        id: 'troubleshooting',
        h: 'Troubleshooting',
        html: `<h3>My recording has no sound</h3>
<p>Check what you shared. A window never has sound. For a tab, keep <strong>Also share tab audio</strong> on; for your screen, tick <strong>Also share system audio</strong>. Also make sure the tab or app was actually playing sound and isn’t muted.</p>
<h3>A streaming video shows up black</h3>
<p>Many streaming services protect their videos, and Chrome shows them as black in every screen recording. That is intentional and can’t be bypassed.</p>
<h3>The recording stopped when I closed a tab</h3>
<p>Screen recording in Chrome needs a page to run in, so FrameShot keeps its recorder tab open while you record. Leave that tab open until you stop. If it was closed by accident, reopen FrameShot to recover the recording.</p>
<h3>My microphone is too quiet</h3>
<p>Watch the level meter before you start, and check the input volume in your system’s sound settings. If you have several microphones, pick the right one in the recorder.</p>`,
      },
    ],
  },

  'how-to-blur-or-redact-sensitive-information-in-screenshots': {
    intro: `<p>Screenshots leak more than people expect: an email address in a corner, a customer’s name in a sidebar, an access token in the address bar. Covering them up is easy, but not every way of covering them actually hides them. Here is what to look for before you share, the real difference between blurring, pixelating and redacting, and how to do it properly.</p>`,
    sections: [
      {
        id: 'checklist',
        h: 'What to check before you share',
        html: `<p>Look over the whole image, not just the part you meant to show. These are the details that slip through most often:</p>
<ul>
<li><strong>Personal details:</strong> names, email addresses, phone numbers, home addresses and profile pictures.</li>
<li><strong>Secrets:</strong> passwords, API keys, access tokens, recovery codes and one-time codes.</li>
<li><strong>Money:</strong> card numbers, bank details, account balances and invoice amounts.</li>
<li><strong>Codes you can scan:</strong> QR codes and barcodes on tickets, boarding passes and parcels.</li>
<li><strong>The edges of the screen:</strong> notifications, chat previews, other open tabs and your bookmarks bar.</li>
<li><strong>Addresses in the URL bar:</strong> links that contain session IDs, tokens or email addresses.</li>
<li><strong>The file name:</strong> it may contain the page title or the website’s name.</li>
</ul>`,
      },
      {
        id: 'blur-pixelate-redact',
        h: 'Blur, pixelate or redact: what’s the difference?',
        html: `<p><strong>Blur</strong> smears each pixel into its neighbours. <strong>Pixelate</strong> replaces squares of the image with their average colour. Both make content hard to read at a glance, but both keep some information about what was there. For short pieces of text in a known format, like a card number, a date or a short code, that can be enough to work backwards: open-source tools such as Depix have recovered pixelated text from screenshots, and researchers have shown the same for blurred faces and text.</p>
<p>A <strong>solid redaction box</strong> replaces the pixels completely. There is nothing left to recover, because the original content is no longer in the image.</p>
<table>
<thead><tr><th>Method</th><th>Good for</th><th>Can it be undone?</th></tr></thead>
<tbody>
<tr><td>Blur</td><td>Faces, backgrounds, long passages you only want to soften</td><td>Sometimes, for short text</td></tr>
<tr><td>Pixelate</td><td>The same, with a more obvious look</td><td>Sometimes, for short text</td></tr>
<tr><td>Solid box</td><td>Passwords, numbers, codes, anything secret</td><td>No</td></tr>
</tbody>
</table>
${callout('ShieldAlert', '<p><strong>Rule of thumb:</strong> if it would be a problem for someone to read it, use a solid box. Use blur when you only want to keep the viewer’s attention elsewhere.</p>')}`,
      },
      {
        id: 'how-to',
        h: 'How to redact a screenshot with FrameShot',
        html: `<ol>
<li><strong>Capture the page</strong> with FrameShot, or import an existing image into the library.</li>
<li><strong>Open it in the editor</strong> and pick <strong>Blur</strong>, <strong>Pixelate</strong> or <strong>Redact (solid)</strong> from the toolbar.</li>
<li><strong>Drag over the area to hide.</strong> Adjust the blur strength, the pixel block size or the box colour in the side panel. You can move or resize the area at any time.</li>
<li><strong>Export.</strong> When you download, copy or save as PDF, the effect is flattened into the pixels of the new file. The hidden content does not exist in what you share.</li>
</ol>
${fig('redact', 'FrameShot Studio — Editor', 'A billing form in the FrameShot editor with an email address blurred and a card number covered by a solid box', 'Blur for the email, a solid box for the card number. FrameShot warns that blur and pixelation can be reversible.')}
<p>FrameShot keeps your original capture in the library so you can change your mind later. When even your own copy shouldn’t contain the hidden details, choose <strong>Apply edits permanently</strong> in the editor’s menu to replace the original.</p>`,
      },
      {
        id: 'mistakes',
        h: 'Common redaction mistakes',
        html: `<ul>
<li><strong>Using a highlighter or a see-through shape.</strong> A semi-transparent box only tints the text. Make sure the cover is fully opaque.</li>
<li><strong>Covering text in a document editor.</strong> Drawing a black rectangle over text in many PDF or document editors leaves the text underneath, where it can be selected and copied. Redact the image itself, or use a tool that removes the text.</li>
<li><strong>Trusting a crop to delete things.</strong> In 2023 a bug known as “aCropalypse” showed that some phone and desktop screenshot tools left the cropped-away part of the image inside the saved file. Exporting a fresh image, as FrameShot does, avoids leftovers like that.</li>
<li><strong>Hiding it once, showing it twice.</strong> The same name often appears in a header, a tab title and a sidebar. Check every copy.</li>
<li><strong>Forgetting the file name.</strong> FrameShot names files from a template that can include the page title and the website. Rename the download if the name gives something away.</li>
</ul>`,
      },
      {
        id: 'recordings',
        h: 'What about screen recordings?',
        html: `<p>Hiding things in a video afterwards is much harder than in a screenshot, so plan before you press record:</p>
<ul>
<li>Share a single tab instead of your entire screen, so notifications and other apps stay out of the video.</li>
<li>Turn on Do Not Disturb so message previews don’t pop up.</li>
<li>Use a demo account or test data rather than real customers.</li>
<li>Close tabs and windows you don’t need, and hide your bookmarks bar.</li>
</ul>
<p>If something private still slips into a recording, save that frame as a screenshot in FrameShot’s player, redact it, and share the screenshot instead, or record that part again.</p>`,
      },
    ],
  },

  'how-to-turn-a-screen-recording-into-a-gif': {
    intro: `<p>A short GIF is often the clearest way to show how something works: it plays by itself, loops and needs no player. It is also easy to end up with a blurry 30 MB file. Here is when a GIF is the right choice, how to make one from a screen recording in Chrome, and which settings keep it sharp and small.</p>`,
    sections: [
      {
        id: 'when',
        h: 'When a GIF beats a video',
        html: `<p>GIFs start playing on their own and loop, almost everywhere: team chats, issue trackers, documentation, README files and many email apps (a few older desktop email apps show only the first frame). They are ideal for short, silent moments, like how a menu opens, where a button is, or what happens after a click.</p>
<p>Choose a video instead when you need sound or narration, when the clip is longer than about half a minute, or when the content is full of colour and motion, like a game or a film. Videos are much smaller for the same length and quality.</p>`,
      },
      {
        id: 'how',
        h: 'How to make a GIF from a recording in FrameShot',
        html: `<ol>
<li><strong>Record your screen</strong> with FrameShot, or open an existing recording from the library.</li>
<li>In the player, click <strong>Export GIF</strong>.</li>
<li><strong>Choose the range.</strong> Set the start and end so the GIF covers just the moment you need, up to 60 seconds.</li>
<li><strong>Pick a width and a frame rate:</strong> 320, 480, 640 or 800 pixels wide, at 10, 15 or 20 frames per second.</li>
<li><strong>Choose whether it loops</strong> forever or plays once.</li>
<li><strong>Export.</strong> FrameShot shows the progress and saves the GIF to your computer. Everything happens on your device, nothing is uploaded.</li>
</ol>
${fig('gif', 'FrameShot Studio — Player', 'The Export as GIF dialog over a recording, showing the selected range, width and frame rate', 'Pick the part of the recording, the size and the frame rate.')}`,
      },
      {
        id: 'settings',
        h: 'Choosing size and frame rate',
        html: `<p>File size grows quickly with every setting: twice the width means about four times the pixels in every frame, and twice the frame rate means twice as many frames.</p>
<ul>
<li><strong>640 pixels wide</strong> is a good default for docs and tickets. Use <strong>480</strong> for chat messages and <strong>800</strong> when small text must stay readable.</li>
<li><strong>15 fps</strong> looks smooth for most interface demos. <strong>10 fps</strong> is enough for clicks and typing, and <strong>20 fps</strong> helps with scrolling and animation.</li>
<li><strong>Keep it short.</strong> Five to fifteen seconds usually tells the whole story.</li>
</ul>`,
      },
      {
        id: 'keep-it-small',
        h: 'Keeping GIFs small',
        html: `<p>FrameShot already does the clever part: it builds one colour palette for the whole GIF, makes pixels that don’t change from one frame to the next transparent, and merges frames that are identical. Interface recordings, where most of the screen stays still, shrink a lot that way. You can help it further:</p>
<ul>
<li><strong>Record less screen.</strong> Share a tab or a smaller window rather than a large monitor.</li>
<li><strong>Keep the background still.</strong> Pause videos and animations you aren’t demonstrating.</li>
<li><strong>Move the mouse calmly.</strong> Every change on screen adds data.</li>
<li><strong>Avoid big photos and gradients.</strong> A GIF can show 256 colours per frame, so smooth gradients may look banded.</li>
</ul>
${callout('Lightbulb', '<p>If a GIF is still too big, the clip is probably too long for a GIF. Share the video instead: FrameShot saves recordings as MP4 or WebM.</p>')}`,
      },
      {
        id: 'gif-or-mp4',
        h: 'GIF or MP4?',
        html: `<p>Some websites quietly convert uploaded GIFs into videos because video is so much smaller. GitHub issues, many chat apps and most documentation tools accept short videos too. A good habit is to share a GIF for anything under fifteen seconds that should play by itself, and an MP4 for everything longer or with sound. With FrameShot you can make both from the same recording.</p>`,
      },
    ],
  },

  'why-frameshot-keeps-your-screenshots-on-your-device': {
    intro: `<p>Screenshots and screen recordings capture whatever is on your screen: emails, chats, dashboards, customer records. Many capture tools send that to a server so they can give you a share link. FrameShot doesn’t, and can’t. Here is how it works without a server, what each permission is for, and how you can check it yourself in about a minute.</p>`,
    sections: [
      {
        id: 'why',
        h: 'Why privacy matters for captures',
        html: `<p>A screenshot is a copy of your screen at one moment, often including things you never meant to share. When a capture tool uploads it, a copy now sits on someone else’s computer, under their security, their retention rules and their business model. Even when that company is careful, you’ve lost control of where your data lives.</p>
<p>FrameShot takes the simplest approach to that problem: your captures never leave your computer unless you take them somewhere yourself.</p>`,
      },
      {
        id: 'how',
        h: 'How FrameShot works without a server',
        html: `<p>Everything FrameShot does happens inside Chrome, using features Chrome already provides:</p>
<ul>
<li><strong>Capturing</strong> uses Chrome’s screenshot function for the tab you’re on, and FrameShot stitches the parts together on your computer.</li>
<li><strong>Recording</strong> uses Chrome’s own screen sharing and video recording. The video is saved in small pieces as you record.</li>
<li><strong>Storage</strong> is your browser’s built-in database for the extension, on your computer. It isn’t synced to your Google account.</li>
<li><strong>GIFs, PDFs and ZIP files</strong> are built on your computer, too.</li>
<li><strong>Downloads</strong> go through Chrome’s normal download system into your Downloads folder.</li>
</ul>
<p>On top of that, FrameShot’s pages run under a strict content security policy that only allows connections to the extension itself and to FrameShot’s anonymous install counter. Even if a bug tried to upload a capture somewhere, the extension’s own rules would block it, and an automated test checks that no requests leave the extension during a capture, an edit and an export.</p>
<p>The install counter is the one thing FrameShot sends. When FrameShot is installed, updated or removed, it reports a random ID, the version, your operating system and your browser language, so the developer knows how many people use it. It never includes pages, screenshots, recordings or settings, and you can turn it off in <strong>Settings → Privacy</strong>.</p>`,
      },
      {
        id: 'permissions',
        h: 'Every permission, explained',
        html: `<table>
<thead><tr><th>Permission</th><th>What FrameShot uses it for</th></tr></thead>
<tbody>
<tr><td><code>activeTab</code></td><td>Captures the tab you’re on, and only after you click the icon, use the right-click menu or press a shortcut.</td></tr>
<tr><td><code>scripting</code></td><td>Scrolls the page during a full-page capture and shows the area and element selectors.</td></tr>
<tr><td><code>storage</code>, <code>unlimitedStorage</code></td><td>Keeps your settings and your library on your computer, including long recordings.</td></tr>
<tr><td><code>downloads</code></td><td>Saves the files you export.</td></tr>
<tr><td><code>contextMenus</code></td><td>Adds FrameShot to the right-click menu.</td></tr>
<tr><td><code>offscreen</code></td><td>Plays the shutter and countdown sounds when you capture from the toolbar or a shortcut.</td></tr>
</tbody>
</table>
<p>Just as important is what’s missing: FrameShot asks for no access to your websites in advance, and it reads no page until you start a capture. The microphone and camera are only used when you switch them on in the recorder, after Chrome asks for your permission.</p>`,
      },
      {
        id: 'verify',
        h: 'Check it yourself',
        html: `<p>You don’t have to take our word for it:</p>
<ol>
<li><strong>Go offline.</strong> Turn off Wi-Fi and capture, edit and export as usual. Everything still works, because nothing depends on a server.</li>
<li><strong>Watch the network.</strong> Open the FrameShot library, right-click and choose <strong>Inspect</strong>, then open the <strong>Network</strong> tab. Make a capture, edit it and export it. No requests to other websites appear.</li>
<li><strong>Read the permissions.</strong> Open <code>chrome://extensions</code>, find FrameShot and click <strong>Details</strong> to see exactly what it’s allowed to do.</li>
</ol>`,
      },
      {
        id: 'delete',
        h: 'Deleting your data',
        html: `<p>Delete single screenshots, recordings or collections from the library. To remove everything at once, open <strong>Settings → Storage → Clear all local data</strong>. Uninstalling FrameShot also deletes all of its data from your browser. Files you already downloaded are yours and stay where you saved them.</p>`,
      },
      {
        id: 'trade-offs',
        h: 'The honest trade-off',
        html: `<p>Keeping everything local means FrameShot has no share links and no cloud sync. To share a capture, you download it or copy it and paste it wherever you like: an email, a chat, a ticket or your own cloud drive. To keep a copy somewhere else, select your captures in the library and export them as a ZIP.</p>
<p>We think that’s the right default for a tool that sees your screen. You decide where every file goes, and nothing gets there by accident.</p>`,
      },
      {
        id: 'free',
        h: 'How FrameShot stays free',
        html: `<p>There are no ads, no data to sell and no paid version. FrameShot is kept going by people who rate it, recommend it and, if they want to, <a href="/support">donate</a>. Donating unlocks nothing: every feature is already free for everyone. You can read the full <a href="/privacy">privacy policy</a> for every detail.</p>`,
      },
    ],
  },

  'better-bug-reports-with-screenshots-and-screen-recordings': {
    intro: `<p>“It doesn’t work” is the start of a long conversation. A good bug report lets a developer see the problem, reproduce it and fix it without a single follow-up question. Here is a template that works, plus practical tips for screenshots and short recordings that make your reports impossible to misread.</p>`,
    sections: [
      {
        id: 'why',
        h: 'Why visuals make bug reports faster',
        html: `<p>Words describe what you think happened. A screenshot shows the exact state of the page: the wrong number, the broken layout, the error message word for word. A short recording shows the steps that led there, in order, including the ones you didn’t think mattered. Together they remove most of the guesswork, and guesswork is what makes bugs slow to fix.</p>`,
      },
      {
        id: 'template',
        h: 'A bug report template that works',
        html: `<p>Copy this into your issue tracker and fill it in:</p>
<pre><code>Title: [Where] [What goes wrong]
       e.g. "Checkout: total ignores the discount code"

Steps to reproduce
1. Go to …
2. Click …
3. Enter …

Expected: what should happen
Actual:   what happens instead

Environment
- Browser and version (from chrome://version)
- Operating system
- Account type or test user, if relevant

Evidence
- Annotated screenshot
- Short screen recording or GIF of the steps
- Console errors, if any

How often: every time / sometimes / once</code></pre>
<p>Keep the title specific. “Checkout: total ignores the discount code” can be found, triaged and assigned in seconds. “Bug in checkout” cannot.</p>`,
      },
      {
        id: 'screenshots',
        h: 'Screenshots developers can use',
        html: `<ul>
<li><strong>Capture enough context.</strong> Include the surrounding area so the developer knows where on the page they are. A full-page capture is often best for layout problems, and an element capture for a single component.</li>
<li><strong>Number the steps.</strong> FrameShot’s step markers count themselves, so marker 1, 2 and 3 can match the steps in your report.</li>
<li><strong>Point, don’t describe.</strong> An arrow at the problem and a box around the wrong value beat a paragraph of explanation.</li>
<li><strong>Add the expectation.</strong> A short text note such as “Expected: $25.00” right next to the wrong number makes the bug obvious.</li>
<li><strong>Hide customer data.</strong> Use a solid redaction box for anything personal before you attach the image.</li>
</ul>
${fig('editor', 'FrameShot Studio — Editor', 'A screenshot annotated with arrows, numbered step markers and a text note in the FrameShot editor', 'Numbered markers and an arrow tell the story at a glance.')}`,
      },
      {
        id: 'recordings',
        h: 'When to record instead',
        html: `<p>Record a short video when the bug is about <strong>timing or sequence</strong>: something flickers, a menu closes too early, an animation stutters, or the problem only appears after several steps. Recordings are also the best way to report bugs that happen only sometimes, because you can capture the one time it does.</p>
<ul>
<li><strong>Start one step early</strong>, so the starting state is visible.</li>
<li><strong>Keep it short</strong>, ideally under a minute. Pause the recording while you set up the next step.</li>
<li><strong>Narrate</strong> with your microphone: “Now I click Pay, and the total is still the old amount.”</li>
<li><strong>Share just the tab</strong> to keep notifications and other apps out of the video.</li>
<li><strong>Attach a GIF</strong> when your tracker doesn’t play videos inline. FrameShot’s Export GIF turns the key moment into a small looping clip.</li>
</ul>`,
      },
      {
        id: 'technical',
        h: 'Add the technical details',
        html: `<p>A few extra details save a developer a lot of time:</p>
<ul>
<li><strong>Console errors.</strong> Press ${k('F12')}, open the <strong>Console</strong> tab and copy any red errors as text. Text can be searched; a picture of an error can’t. DevTools sits outside the web page, so page capture tools don’t include it.</li>
<li><strong>Failed requests.</strong> In the <strong>Network</strong> tab, a request shown in red with a status like 404 or 500 often points straight at the cause.</li>
<li><strong>Exact versions.</strong> Open <code>chrome://version</code> and copy the first line.</li>
<li><strong>The page address.</strong> Paste the full URL, minus any private tokens.</li>
</ul>`,
      },
      {
        id: 'checklist',
        h: 'Before you hit submit',
        html: `<ul>
<li>Can someone who has never seen the bug follow the steps?</li>
<li>Does the title say where and what?</li>
<li>Is the expected result written down, not just the actual one?</li>
<li>Is the evidence attached, annotated and free of personal data?</li>
<li>Did you include the browser, the operating system and how often it happens?</li>
</ul>
<p>Five yeses and your report is ready. The developer reading it will thank you, and the bug will be fixed sooner.</p>`,
      },
    ],
  },
};
