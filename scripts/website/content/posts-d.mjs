/** Blog articles, batch D. Every product fact here matches the extension's code, FEATURES.md and README.md. */
import { icon, windowFrame } from '../layout.mjs';

const k = (keys) => keys.split('+').map((x) => `<kbd>${x}</kbd>`).join('+');
const callout = (ic, html) => `<div class="callout">${icon(ic, 20)}<div>${html}</div></div>`;
const fig = (name, title, alt, caption, dark) =>
  `<figure>${windowFrame(name, { title, alt, sizes: '(max-width: 780px) 92vw, 740px', dark })}<figcaption>${caption}</figcaption></figure>`;

export const META_D = [
  {
    slug: 'how-to-record-a-google-meet-call',
    title: 'How to Record a Google Meet Call With Sound',
    description: 'How to record Google Meet calls with everyone’s voices: get consent, check Meet’s own recording, or record the Meet tab and your microphone in Chrome.',
    tag: 'Recording',
    image: 'popup',
    alt: 'The FrameShot popup with the Record screen button, used to start and control a recording of a Google Meet tab',
    date: '2026-11-16',
    keywords: [
      'how to record google meet',
      'record google meet with audio',
      'record google meet without permission from host',
      'google meet recording not available',
      'record a video call in chrome',
      'record meeting tab audio and microphone',
      'where are google meet recordings saved',
    ],
  },
  {
    slug: 'how-to-record-a-presentation',
    title: 'How to Record a Presentation With Your Webcam',
    description: 'Record a presentation with webcam and voice in Chrome: Google Slides presenter view or slideshow, a camera bubble, pauses between sections and an MP4 file.',
    tag: 'Recording',
    image: 'recorder',
    alt: 'The FrameShot recorder with the microphone on and a round webcam bubble, ready to record a slideshow tab',
    date: '2026-11-16',
    keywords: [
      'record a presentation with webcam',
      'record google slides presentation',
      'record presentation with voice and face',
      'record slideshow in chrome',
      'presenter view recording',
      'record a presentation as mp4',
    ],
  },
  {
    slug: 'mp4-vs-webm-for-screen-recordings',
    title: 'MP4 vs WebM for Screen Recordings: Which to Use',
    description: 'MP4 vs WebM explained for screen recordings: codecs, where each file plays and uploads, quality and size, when Chrome records MP4, and how to convert.',
    tag: 'Guide',
    image: 'library-dark',
    alt: 'The FrameShot library in dark mode with recording cards showing their length, size and video format',
    date: '2026-11-16',
    keywords: [
      'mp4 vs webm',
      'webm vs mp4 quality',
      'is webm better than mp4',
      'convert webm to mp4',
      'chrome record mp4',
      'h.264 vs vp9',
      'why is my screen recording webm',
    ],
  },
  {
    slug: 'how-to-reduce-screen-recording-file-size',
    title: 'How to Reduce Screen Recording File Size: What Works',
    description: 'Reduce screen recording file size with the right resolution, frame rate, length and format, plus simple presets for chat, email and documentation.',
    tag: 'Tips',
    image: 'gif',
    alt: 'The FrameShot Export as GIF dialog with width and frame-rate options for keeping a short clip small',
    date: '2026-11-16',
    keywords: [
      'reduce screen recording file size',
      'make screen recording smaller',
      'compress screen recording',
      'screen recording too large to email',
      'best resolution for screen recording',
      'screen recording frame rate',
      'small screen recording for slack',
    ],
  },
  {
    slug: 'how-to-organize-screenshots',
    seoTitle: 'How to Organize Screenshots: Names, Folders and Tags',
    title: 'How to Organize Screenshots: Names, Folders, Tags',
    description: 'Organize screenshots so you can find them again: file naming conventions, automatic name templates, folders, tags, collections and a weekly clean-up.',
    tag: 'Workflow',
    image: 'library-light',
    alt: 'The FrameShot library with screenshots sorted into collections, with search, a website filter and favourites',
    date: '2026-11-16',
    keywords: [
      'organize screenshots',
      'screenshot naming convention',
      'how to manage screenshots',
      'find old screenshots',
      'delete duplicate screenshots',
      'screenshot file name template',
      'tag screenshots',
    ],
  },
];

export const BODIES_D = {
  'how-to-record-a-google-meet-call': {
    intro: `<p>To record a Google Meet call, first tell everyone you’re recording and get their agreement. Then either use Meet’s own <strong>Recording</strong> option, which is only offered on some Google Workspace plans, or record the Meet tab yourself with a screen recorder in Chrome: share the tab with its sound to capture the other people, and switch on your microphone to capture your own voice.</p>
<p>This guide covers both routes, explains why the sound needs two sources, walks through a recording step by step, and ends with tips for a clean result and where the file ends up.</p>`,
    sections: [
      {
        id: 'consent',
        h: 'Do you need permission to record a Google Meet call?',
        html: `<p>Almost always, yes, and this comes before any technical step. A meeting recording captures other people’s faces, voices and names, and often things they said on the assumption that nobody would keep them.</p>
${callout('TriangleAlert', '<p><strong>Ask first, every time.</strong> Laws on recording conversations differ between countries and regions: some require everyone’s consent, some only one person’s, and data protection rules may apply on top. Your employer or school may also have its own rules about recording meetings. Say at the start that you’d like to record, explain why, and stop if anyone objects. This is general guidance, not legal advice.</p>')}
<p>When Meet’s built-in recording is used, Meet tells participants that the meeting is being recorded. A screen recorder on your own computer doesn’t: nobody else in the call can see it. That makes saying it out loud even more important. A simple line works: “Is everyone OK if I record this so I can write up the notes? I’ll delete it afterwards.”</p>
<p>It also helps to decide in advance how long you’ll keep the recording and who you’ll share it with, and to keep it to yourself unless everyone agreed to more.</p>`,
      },
      {
        id: 'built-in',
        h: 'Can you use Google Meet’s own Record button?',
        html: `<p>Meet has a built-in recorder, but whether you can use it depends on your account:</p>
<ul>
<li><strong>It’s tied to Google Workspace.</strong> Recording is included in some Workspace editions and not others, and it generally isn’t available on personal Google accounts. Google changes which plans include it from time to time, so check Google’s current Meet help pages for your plan.</li>
<li><strong>An administrator may need to turn it on.</strong> Even on a plan that includes it, your organization’s admin can switch recording off.</li>
<li><strong>The host may control it.</strong> Usually the meeting organizer, co-hosts, or people in the organizer’s organization can record. Guests from outside often can’t.</li>
</ul>
<p>If you can use it, you’ll find recording among Meet’s activities or in the three-dot menu, depending on your version. Recordings are typically saved to the organizer’s Google Drive, and Meet emails a link when the file is ready.</p>
<p>If the option isn’t there, greyed out, or you’re a guest in someone else’s meeting, the alternative is to record the Meet tab on your own computer, with everyone’s consent, as described below.</p>`,
      },
      {
        id: 'two-sources',
        h: 'Why recording a meeting needs two sound sources',
        html: `<p>The most common problem with self-made meeting recordings is that half the conversation is missing. The reason is simple: Meet plays the other people through your speakers or headphones, but it never plays your own voice back to you. So the sound you need comes from two places.</p>
<table>
<thead><tr><th>Who you hear</th><th>Where the sound comes from</th><th>How to record it</th></tr></thead>
<tbody>
<tr><td><strong>Everyone else</strong></td><td>The Meet tab in Chrome</td><td>Share the Meet tab with <strong>Also share tab audio</strong> turned on</td></tr>
<tr><td><strong>You</strong></td><td>Your microphone</td><td>Switch on the microphone in your recorder</td></tr>
</tbody>
</table>
<p>A recorder that captures only the tab gives you everyone but you. One that captures only the microphone gives you you, plus a faint, echoey version of everyone else if you use speakers. You want both, mixed into one track. Our guide to <a href="/blog/how-to-record-your-screen-with-audio-in-chrome">recording your screen with audio in Chrome</a> explains Chrome’s sound options in more detail.</p>`,
      },
      {
        id: 'steps',
        h: 'How to record a Google Meet call with FrameShot',
        html: `<p><a href="/">FrameShot is a screen recorder and screenshot extension for Chrome</a> that mixes a tab’s sound with your microphone. Set it up a minute before the meeting starts:</p>
<ol>
<li><strong>Join the meeting in a normal Chrome tab.</strong> If you usually open Meet as an installed app in its own window, use a regular tab for this call so its sound can be shared.</li>
<li><strong>Click the FrameShot icon and choose Record screen.</strong> The recorder opens in a FrameShot tab. Keep that tab open until you finish.</li>
<li><strong>Set Open Chrome’s picker on to Tab</strong> and switch on <strong>Tab &amp; system sound</strong>.</li>
<li><strong>Switch on the microphone.</strong> Chrome asks for permission the first time. Pick the same microphone you use in Meet, speak, and check that the level meter moves.</li>
<li><strong>Leave the camera bubble off</strong> unless you want it. Meet already shows your video tile, so a second copy of your face is usually just clutter.</li>
<li><strong>Choose the quality.</strong> 1080p at 30 frames per second is plenty for a video call, and 720p keeps long meetings smaller. Add a 3 or 5 second countdown if you like.</li>
<li><strong>Click Start recording.</strong> In Chrome’s dialog, open the tab list, select the Meet tab, make sure <strong>Also share tab audio</strong> is on, and click <strong>Share</strong>.</li>
<li><strong>Go back to the meeting.</strong> Chrome usually switches to the shared tab for you. The FrameShot toolbar badge counts down and then shows <code>REC</code>.</li>
<li><strong>Stop when the meeting ends,</strong> from the FrameShot popup, from the recorder tab, or with Chrome’s <strong>Stop sharing</strong> bar. The recording opens in FrameShot’s player.</li>
</ol>
${fig('recorder', 'FrameShot Studio — Recorder', 'The FrameShot recorder set to record a Chrome tab with tab sound and the microphone switched on, and live level meters', 'Tab sound for the other people, the microphone for you.')}
<p>While you record, the FrameShot popup on the toolbar gives you pause, stop and microphone controls, so you don’t need to leave the meeting tab. Paused time is left out of the video, which is handy for a break or an off-the-record moment.</p>`,
      },
      {
        id: 'tab-window-screen',
        h: 'Should you record the Meet tab, a window or the whole screen?',
        html: `<p>Chrome offers three things to share. For a meeting, the choice decides whether you get the other people’s voices at all:</p>
<table>
<thead><tr><th>You share</th><th>What’s recorded</th><th>Other people’s voices</th></tr></thead>
<tbody>
<tr><td><strong>The Meet tab</strong></td><td>Only the meeting: no other tabs, apps or desktop notifications</td><td>Yes, on every system, with <strong>Also share tab audio</strong> on</td></tr>
<tr><td><strong>A window</strong></td><td>One app window</td><td>No: Chrome never shares a window’s sound</td></tr>
<tr><td><strong>Entire screen</strong></td><td>Everything on that screen</td><td>On Windows and ChromeOS, and on macOS 14.2 or later with Chrome 141 or later, if you tick <strong>Also share system audio</strong></td></tr>
</tbody>
</table>
<p>The tab is the right choice for nearly every meeting. Share the whole screen only if you need to show another app during the call and want it in the recording, and remember that everything else on that screen, including message previews, is recorded too. If you’re recording desktop apps outside Chrome, our guides for <a href="/blog/how-to-screen-record-on-windows">Windows</a> and <a href="/blog/how-to-screen-record-on-a-mac-with-sound">Mac</a> cover the built-in tools.</p>`,
      },
      {
        id: 'tips',
        h: 'Tips for a clean meeting recording',
        html: `<ul>
<li><strong>Wear headphones.</strong> With speakers, your microphone picks up the other people a second time, slightly delayed, which sounds like an echo in the recording.</li>
<li><strong>Mute in both places.</strong> Muting yourself in Meet doesn’t mute your recorder’s microphone. If you want something left out, mute in the FrameShot popup too, or pause.</li>
<li><strong>Pick a layout that suits the recording.</strong> Meet lets you change the layout from its three-dot menu. A spotlight or sidebar layout keeps the person speaking large; a tiled layout shows everyone small.</li>
<li><strong>Turn on captions if they help.</strong> Meet’s live captions appear inside the tab, so they’re recorded too. That can make the video easier to follow, and easier to skim later.</li>
<li><strong>Silence notifications.</strong> Recording the tab keeps desktop pop-ups out, but turn on Do Not Disturb (Focus on a Mac) anyway, especially if you share the whole screen.</li>
<li><strong>Close the chat panel</strong> if you don’t want private side messages in the video, or keep it open if the chat is part of the record.</li>
<li><strong>Make a test recording first.</strong> Join a test call or ask a colleague for 30 seconds, record, and play it back. Check that you can hear both them and you before an important meeting.</li>
<li><strong>Check your disk space.</strong> FrameShot sets no time limit, but an hour of video takes real space. The library shows how much storage you’re using.</li>
</ul>
${callout('Lightbulb', '<p>Recordings are saved in small pieces while you record. If Chrome or your computer crashes halfway through, reopen FrameShot and it offers to recover the recording, minus the last few seconds.</p>')}`,
      },
      {
        id: 'saved',
        h: 'Where is the recording saved?',
        html: `<p>When you stop, the recording is saved in FrameShot’s library, in your browser on your computer. Nothing is uploaded and there’s no share link: the video stays on your device until you download it. From the player you can:</p>
<ul>
<li><strong>Download</strong> it as MP4, or as WebM if your Chrome can’t record MP4. It goes to your Downloads folder, or to a sub-folder you choose in <strong>Settings → Export &amp; downloads</strong>. Our comparison of <a href="/blog/mp4-vs-webm-for-screen-recordings">MP4 and WebM</a> explains the difference.</li>
<li><strong>Rename</strong> it after the meeting, for example “2026-11-16 Project kickoff”, so you can find it later.</li>
<li><strong>Save frame</strong> to turn a moment, such as a shared slide, into a screenshot you can annotate.</li>
<li><strong>Export a GIF</strong> of a short part, up to 60 seconds, though for meetings a short video clip usually makes more sense.</li>
<li><strong>Delete</strong> it when you no longer need it, as you promised the others.</li>
</ul>
<p>An hour-long meeting can be a large file. If you need to send it, see <a href="/blog/how-to-reduce-screen-recording-file-size">how to reduce screen recording file size</a>. FrameShot doesn’t trim or cut videos, so to remove the small talk at the start, open the downloaded file in a video editor. How FrameShot handles your files is set out in our <a href="/privacy">privacy policy</a>.</p>`,
      },
      {
        id: 'faq',
        h: 'Common questions',
        html: `<h3>Can I record Google Meet if I’m not the host?</h3>
<p>Meet’s own recorder is usually limited to the organizer, co-hosts or people in the organizer’s organization. You can still record the Meet tab on your own computer with a screen recorder, but only with everyone’s consent and in line with local law and your organization’s rules.</p>
<h3>Why is Google Meet recording not available for me?</h3>
<p>Built-in recording is only included in some Google Workspace plans, it isn’t generally offered on personal accounts, and an administrator can turn it off. Check Google’s Meet help for your plan, or ask your admin.</p>
<h3>Does Google Meet notify others when I screen record?</h3>
<p>Meet shows a notice when its own recorder is running. It can’t see a screen recorder running on your computer, so the others won’t be told unless you tell them. Always announce it.</p>
<h3>Why can I hear the others but not myself in my recording?</h3>
<p>Your voice isn’t part of the tab’s sound. Switch on the microphone in the recorder before you start, and make sure it isn’t muted in the recorder while you talk.</p>
<h3>Can I record a Meet call on a Chromebook or a Mac?</h3>
<p>Yes. Tab sound works in Chrome on every system, so recording the Meet tab with your microphone works the same on Windows, macOS, ChromeOS and Linux. Presenting slides in the call? See <a href="/blog/how-to-record-a-presentation">how to record a presentation</a>.</p>`,
      },
    ],
  },

  'how-to-record-a-presentation': {
    intro: `<p>To record a presentation with your webcam, open your slides in a Chrome tab, start a screen recorder with your microphone and a camera bubble switched on, share the tab with your slideshow, and present as you normally would. You end up with one video that shows your slides, your face in a corner and your voice, ready to send as an MP4.</p>
<p>Below you’ll find how to prepare the slides, whether to record presenter view or the slideshow, the exact steps in Chrome, how to handle pauses and mistakes, and what to do with the file afterwards. The examples use Google Slides, but the same approach works for any presentation that runs in a browser tab.</p>`,
    sections: [
      {
        id: 'prepare',
        h: 'How to prepare slides for a recorded presentation',
        html: `<p>A recorded presentation is watched differently from a live one. People watch on laptops and phones, often at a smaller size, and they can pause or skip. A few changes help:</p>
<ul>
<li><strong>Use a widescreen slide size.</strong> A 16:9 deck fills a standard video frame with no black bars. In Google Slides, the page size is under <strong>File → Page setup</strong>.</li>
<li><strong>Make text bigger than usual.</strong> If a line is hard to read on your laptop at arm’s length, it will be unreadable on a phone. Fewer words per slide helps more than any font.</li>
<li><strong>Leave a corner free.</strong> Your camera bubble will sit in one corner of the video. Pick a corner, usually bottom right, and keep important content away from it.</li>
<li><strong>Write speaker notes.</strong> A few bullets per slide keep you on track without reading a script word for word.</li>
<li><strong>Check embedded videos and links.</strong> If a slide plays a video with sound, you’ll want to record the tab’s sound too.</li>
<li><strong>Remove anything private.</strong> Comments, draft notes and real customer names have a way of showing up in recordings. Fixing them afterwards means editing the video.</li>
</ul>`,
      },
      {
        id: 'presenter-view',
        h: 'Should you record presenter view or the slideshow?',
        html: `<p>Google Slides has two ways to present, and the difference matters when you record:</p>
<ul>
<li><strong>Slideshow</strong> shows your slides full screen in the tab. Nothing else is visible.</li>
<li><strong>Presenter view</strong> shows the slideshow in the tab as well, and opens a separate small window with your speaker notes, a timer and the next slide.</li>
</ul>
<p>Either way, the thing to record is the <strong>tab with the slides</strong>, never the presenter view window. Viewers should see your slides, not your notes and timer.</p>
<table>
<thead><tr><th>What you share</th><th>What viewers see</th><th>When to use it</th></tr></thead>
<tbody>
<tr><td><strong>The slideshow tab</strong></td><td>Only the slides</td><td>Almost always; it also lets you record sound from embedded videos</td></tr>
<tr><td><strong>The presenter view window</strong></td><td>Your notes, timer and next slide</td><td>Never for the audience</td></tr>
<tr><td><strong>Entire screen</strong></td><td>Slides plus anything else on that screen</td><td>When you switch between the slides and a live demo in another app</td></tr>
</tbody>
</table>
<p>With two monitors, the best setup is the slideshow full screen on one and the presenter view window on the other. With one screen, the notes window can still sit to the side, outside the recorded tab. If you present from a desktop app instead of a browser, share your entire screen, since window recording never includes sound and full-screen apps can behave differently from one system to another.</p>`,
      },
      {
        id: 'setup',
        h: 'Set up your webcam, microphone and room',
        html: `<p><strong>Your voice matters more than your picture.</strong> Viewers forgive a slightly soft camera, but not a muffled or echoing voice.</p>
<ul>
<li><strong>Microphone:</strong> a headset or a microphone close to your mouth, in a quiet room. Soft furnishings cut down echo.</li>
<li><strong>Camera:</strong> roughly at eye level, so you aren’t looking down at the lens. A stack of books under a laptop works.</li>
<li><strong>Light:</strong> face a window or a lamp. Light behind you turns your face into a silhouette.</li>
<li><strong>Background:</strong> tidy and plain. The bubble is small, but a busy background still pulls attention.</li>
<li><strong>Notifications:</strong> turn on Do Not Disturb on Windows, or a Focus on a Mac. Recording only the tab keeps pop-ups out of the video, but they still distract you.</li>
<li><strong>Headphones:</strong> if your slides play sound, wear them so your microphone doesn’t record the same sound a second time.</li>
</ul>
<p>Look at the camera, not the slides, when you open and close. It feels odd, but it reads as eye contact on the recording.</p>`,
      },
      {
        id: 'steps',
        h: 'How to record a presentation with webcam in Chrome',
        html: `<p>Here is the process with <a href="/">FrameShot’s screen recorder for Chrome</a>:</p>
<ol>
<li><strong>Open your slides in a Chrome tab</strong> and go to the first slide, but don’t start the slideshow yet.</li>
<li><strong>Click the FrameShot icon and choose Record screen.</strong> The recorder opens in a FrameShot tab, which must stay open while you record.</li>
<li><strong>Switch on the microphone</strong> and check the level meter as you speak. Chrome asks for permission the first time.</li>
<li><strong>Switch on the camera bubble.</strong> Choose the corner you left free on your slides and one of the three sizes. Your camera appears in a round bubble that is drawn into the video.</li>
<li><strong>Turn on tab sound</strong> if any slide plays a video or audio.</li>
<li><strong>Choose quality and a countdown.</strong> 1080p at 30 frames per second suits most decks. A 5 or 10 second countdown gives you time to start the slideshow.</li>
<li><strong>Click Start recording.</strong> In Chrome’s dialog, choose the tab with your slides and click <strong>Share</strong>. Chrome usually switches to that tab.</li>
<li><strong>Start the slideshow</strong> during the countdown. In Google Slides, click <strong>Slideshow</strong>, or open its menu for presenter view.</li>
<li><strong>Present.</strong> Talk to the camera, move through your slides, and pause between sections if you need a moment.</li>
<li><strong>Stop</strong> when you’re done. End the slideshow, then stop from the FrameShot popup, the recorder tab or Chrome’s <strong>Stop sharing</strong> bar. The video opens in the player.</li>
</ol>
${fig('recorder', 'FrameShot Studio — Recorder', 'The FrameShot recorder with a Chrome tab selected, the microphone level meter active and a round webcam bubble in the bottom corner', 'Microphone on, camera bubble in a free corner, tab selected.')}
<p>You can move or resize the camera bubble while recording, for example if a slide has a chart in that corner. The same setup works for a lesson or a product walkthrough; our <a href="/blog/how-to-record-a-video-tutorial-with-your-webcam">tutorial video guide</a> focuses on that.</p>`,
      },
      {
        id: 'pauses',
        h: 'Pauses, mistakes and keeping it short',
        html: `<p><strong>Pause between sections.</strong> FrameShot’s pause leaves the paused time out of the video, so you can stop to breathe, check your notes or drink some water without a long silence in the result. The pause button is in the FrameShot popup on the toolbar and in the recorder tab.</p>
<p>A full-screen slideshow hides the toolbar. A few ways around that:</p>
<ul>
<li><strong>Use a second monitor</strong> with a normal Chrome window on it, so the toolbar is always within reach.</li>
<li><strong>Leave the slideshow</strong> with ${k('Esc')} at the end of a section, pause, and start the slideshow again from the current slide when you resume. The viewer sees a clean jump to the next section.</li>
<li><strong>Record each section separately.</strong> Stop at the end of each part and start a new recording for the next. You get several short videos instead of one long one.</li>
</ul>
<p><strong>Handle mistakes calmly.</strong> A small slip is fine: correct yourself and carry on, as you would live. If a take goes badly wrong early on, discard it and start again. Discarding deletes all the recorded data.</p>
<p><strong>Keep it short.</strong> Recorded presentations tend to run longer than live ones because there’s nobody to keep you moving. Cut slides rather than speeding up, and keep each recording to one topic. If you have an hour of material, several short parts are easier to watch than one long video.</p>
${callout('Info', '<p>FrameShot doesn’t edit or trim videos. The only range you can choose is when you export a GIF. To cut out a section, join parts or add titles, download the MP4 and open it in a video editor.</p>')}`,
      },
      {
        id: 'quality',
        h: 'Which quality settings suit a slide presentation?',
        html: `<p>FrameShot records at 720p, 1080p, 1440p or 4K, at 15, 30 or 60 frames per second. Quality is the largest size recorded: a smaller tab or screen keeps its own size and isn’t scaled up.</p>
<table>
<thead><tr><th>Presentation</th><th>Suggested setting</th></tr></thead>
<tbody>
<tr><td>Standard slides with text and images</td><td>1080p, 30 fps</td></tr>
<tr><td>Dense charts, spreadsheets or code on a large monitor</td><td>1440p, 30 fps</td></tr>
<tr><td>Long talks where file size matters</td><td>1080p or 720p, 15 fps</td></tr>
<tr><td>Slides with smooth animations or embedded video</td><td>1080p, 30 or 60 fps</td></tr>
</tbody>
</table>
<p>Slides change rarely, so a low frame rate looks fine for the slides themselves. Your face in the bubble moves all the time, though, and at 15 fps it can look a little choppy. 30 fps is a safe middle. For more ways to keep the file manageable, see <a href="/blog/how-to-reduce-screen-recording-file-size">how to reduce screen recording file size</a>.</p>`,
      },
      {
        id: 'export',
        h: 'Export the MP4 and make a GIF of a key slide',
        html: `<p>When you stop, the recording is saved in FrameShot’s library on your computer and opens in the player. From there:</p>
<ul>
<li><strong>Download</strong> the video. It is saved as MP4 when your Chrome can record it, which plays in presentation apps, on phones and on video sites, and as WebM otherwise. Our guide to <a href="/blog/mp4-vs-webm-for-screen-recordings">MP4 vs WebM</a> explains why.</li>
<li><strong>Rename</strong> it with the talk’s name and date, and mark it as a favourite if you’ll reuse it.</li>
<li><strong>Save frame</strong> turns the current moment into a screenshot, opened in the editor. It makes a good thumbnail or a still for an email.</li>
<li><strong>Export GIF</strong> turns a short range, up to 60 seconds, into a looping GIF. Pick a width between 320 and 800 pixels and a frame rate between 10 and 20 fps.</li>
</ul>
<p>A GIF works well for one key moment: a slide transition that reveals a result, a chart building up, or a before-and-after. It plays by itself in docs, chats and email, without sound. Keep it to a few seconds for a small file; our guide to <a href="/blog/how-to-turn-a-screen-recording-into-a-gif">turning a screen recording into a GIF</a> has the details.</p>
${fig('gif', 'FrameShot Studio — Player', 'The Export as GIF dialog over a recorded presentation, with a short range selected and width and frame rate options', 'A few seconds of the key slide, as a GIF that plays by itself.')}
<p>Nothing is uploaded at any point, as our <a href="/privacy">privacy policy</a> explains. You share the video by sending or uploading the downloaded file wherever your audience will watch it.</p>`,
      },
      {
        id: 'faq',
        h: 'Common questions',
        html: `<h3>How do I record myself presenting a PowerPoint or Google Slides deck?</h3>
<p>Open the deck in a Chrome tab, start a screen recorder with the microphone and camera on, share that tab and start the slideshow. For a desktop presentation app, share your entire screen instead.</p>
<h3>Can I see my speaker notes while recording?</h3>
<p>Yes. In Google Slides, use presenter view and record only the slideshow tab. The notes window isn’t part of the tab, so viewers don’t see it.</p>
<h3>Will the webcam bubble cover my slides?</h3>
<p>It sits in one corner. Choose the corner and size before you start, keep that corner of your slides clear, and move or resize the bubble while recording if a slide needs the space.</p>
<h3>Can I edit the recording in FrameShot?</h3>
<p>No. FrameShot records, plays and downloads videos but doesn’t edit them, apart from choosing a range for a GIF. Pause while recording to leave out gaps, and use a video editor for cuts.</p>
<h3>How do I share a recorded presentation?</h3>
<p>Download the MP4 and upload it to your video platform, course site or shared drive, or attach it if it is small enough. Recording a live talk in a call instead? See <a href="/blog/how-to-record-a-google-meet-call">how to record a Google Meet call</a>.</p>`,
      },
    ],
  },

  'mp4-vs-webm-for-screen-recordings': {
    intro: `<p>MP4 vs WebM comes down to where the video will be played. MP4 with H.264 video plays almost everywhere: phones, Macs, PCs, presentation apps and video editors. WebM plays in web browsers and is an open, royalty-free format, but some desktop apps and editors don’t open it. For a screen recording you’ll share, MP4 is usually the safer choice; WebM is fine when the video will be watched in a browser.</p>
<p>This guide explains what each format actually is, compares compatibility, quality and file size, explains when Chrome can record MP4, and shows how to convert one into the other when you need to.</p>`,
    sections: [
      {
        id: 'containers-and-codecs',
        h: 'Containers and codecs: what MP4 and WebM really are',
        html: `<p>MP4 and WebM are <strong>containers</strong>: file formats that hold a video track, a sound track and some information about them, such as the length. The actual picture and sound inside are compressed with <strong>codecs</strong>. When people say a file “won’t play”, the codec is often the real problem, not the container.</p>
<ul>
<li><strong>MP4</strong> is a widely used container from the MPEG family. It most often holds <strong>H.264</strong> video and <strong>AAC</strong> sound, a combination almost every device can play. It can also hold newer codecs such as H.265 (HEVC) or AV1, and Opus sound.</li>
<li><strong>WebM</strong> is an open container designed for the web and promoted by Google. It holds <strong>VP8</strong>, <strong>VP9</strong> or <strong>AV1</strong> video and <strong>Opus</strong> or Vorbis sound, all of which are royalty-free.</li>
</ul>
<p>So “MP4 vs WebM” for a screen recording usually means H.264 with AAC or Opus against VP9 or VP8 with Opus. That is exactly what Chrome records.</p>`,
      },
      {
        id: 'comparison',
        h: 'MP4 vs WebM at a glance',
        html: `<table>
<thead><tr><th></th><th>MP4 (H.264)</th><th>WebM (VP9 or VP8)</th></tr></thead>
<tbody>
<tr><th>Plays in web browsers</th><td>Yes</td><td>Yes, in current versions of the major browsers</td></tr>
<tr><th>Plays on phones</th><td>Yes</td><td>Usually on Android; varies on iPhone and iPad</td></tr>
<tr><th>Opens in desktop players</th><td>Yes, including the players built into Windows and macOS</td><td>Varies: some built-in players can’t open it</td></tr>
<tr><th>Video editors and presentation apps</th><td>Almost all</td><td>Some, but not all</td></tr>
<tr><th>Video sites</th><td>Accepted everywhere</td><td>Accepted by many</td></tr>
<tr><th>Licensing</th><td>Patent-licensed codecs</td><td>Open and royalty-free</td></tr>
<tr><th>Quality for its size</th><td>Good</td><td>VP9 can look slightly better at the same size</td></tr>
<tr><th>Recorded by Chrome</th><td>Recent versions, where an H.264 encoder is available</td><td>For many years, on every system</td></tr>
<tr><th>Best for</th><td>Sharing, editing, slides, email</td><td>Watching in a browser, open-format workflows</td></tr>
</tbody>
</table>`,
      },
      {
        id: 'compatibility',
        h: 'Where do MP4 and WebM files play and upload?',
        html: `<p><strong>MP4 is the universal option.</strong> An H.264 MP4 opens by double-clicking on Windows and Mac, plays on iPhones and Android phones, drops into presentation software, imports into practically any video editor and uploads to any video site, learning platform or help centre. If you don’t know who will watch your recording or on what, choose MP4.</p>
<p><strong>WebM is at home in the browser.</strong> Chrome, Firefox and Edge play it, and recent versions of Safari play many WebM files too. It works well for videos embedded in web pages or shared through tools that play video in the browser. The trouble starts outside the browser:</p>
<ul>
<li>QuickTime Player on a Mac doesn’t open WebM files.</li>
<li>Some editors, slide apps and older media players don’t import it, or import the picture without the sound.</li>
<li>Some chat and email apps preview MP4 inline but show WebM as a plain file attachment.</li>
<li>Older iPhones and iPads may not play it at all.</li>
</ul>
<p>Sound is a small extra wrinkle. MP4 files normally carry AAC sound. Some carry Opus instead, and while most modern players handle that, a few older apps and editors play the picture silently. If an MP4 plays with no sound in one app but fine in Chrome, that’s the likely cause.</p>`,
      },
      {
        id: 'quality-and-size',
        h: 'Is WebM better quality or smaller than MP4?',
        html: `<p>Not by itself. Size depends mainly on the <strong>bitrate</strong>, the amount of data used for each second of video, and that is chosen by the recorder or the encoder, not by the container. Two files with the same bitrate are about the same size whether they are MP4 or WebM.</p>
<p>What differs is how much quality each codec gets out of that data:</p>
<ul>
<li><strong>VP9</strong>, the usual WebM codec, is more modern than H.264 and can look a little sharper at the same file size, especially in scenes with lots of motion.</li>
<li><strong>H.264</strong>, the usual MP4 codec, is older but extremely well supported, and computers and phones can often decode it in hardware, which saves battery when playing.</li>
<li><strong>For screen recordings</strong>, where much of the picture is text and interface that barely changes, the difference is usually small. Resolution and frame rate change the size far more than the format does.</li>
</ul>
<p>In FrameShot, the bitrate is picked from the resolution and frame rate you choose, so MP4 and WebM recordings at the same settings come out at a broadly similar size. Pick the format for where the video will play, and pick the quality for the size you need. Our guide on <a href="/blog/how-to-reduce-screen-recording-file-size">reducing screen recording file size</a> covers the settings that actually matter.</p>`,
      },
      {
        id: 'chrome-mp4',
        h: 'When can Chrome record MP4 instead of WebM?',
        html: `<p>Browser-based recorders, including extensions, record with Chrome’s built-in media recorder. For a long time it could only write WebM, which is why so many browser recordings ended up as <code>.webm</code> files. Newer versions can write MP4 too:</p>
<ul>
<li><strong>Chrome 126 or later</strong> can record MP4, when your system has an <strong>H.264 encoder</strong> that Chrome can use. Where it doesn’t, recordings fall back to WebM.</li>
<li><strong>MP4 sound</strong> is AAC where Chrome can encode it, which is the case on Windows and macOS, and Opus elsewhere.</li>
<li><strong>WebM</strong> uses VP9 or VP8 video with Opus sound.</li>
</ul>
<p>To check your version, open Chrome’s menu and go to <strong>Help → About Google Chrome</strong>. Chrome checks for updates on that page, and you can restart to finish updating.</p>
<p>One older annoyance is worth knowing about: WebM files written by browsers have often lacked a proper length in their header, so players couldn’t show the duration or let you jump ahead. FrameShot repairs this before saving, so its WebM files show their length and seek normally in every player.</p>`,
      },
      {
        id: 'frameshot',
        h: 'How to choose MP4 or WebM in FrameShot',
        html: `<p><a href="/">FrameShot</a> records MP4 with H.264 by default and switches to WebM only when Chrome can’t write MP4. To choose for yourself:</p>
<ol>
<li><strong>For every recording:</strong> open FrameShot’s <strong>Settings</strong>, go to <strong>Screen recording</strong> and set <strong>Format</strong> to MP4 or WebM.</li>
<li><strong>For one recording:</strong> click the FrameShot icon, choose <strong>Record screen</strong> and change <strong>Format</strong> on the recorder screen before you start. FrameShot remembers your last choice.</li>
<li><strong>Check the result:</strong> if your browser can’t write MP4, the recorder says so before you start, and saves WebM instead.</li>
<li><strong>See what you have:</strong> recording cards in the library show the length, size and format of each video.</li>
</ol>
${fig('recorder', 'FrameShot Studio — Recorder', 'The FrameShot recorder settings with the Format, Quality, Frame rate and Countdown options', 'Format, quality and frame rate are set on the recorder screen.')}
<p>When you download, the file keeps the format it was recorded in, and it is named with the same file name template as your screenshots. Our guide to <a href="/blog/how-to-organize-screenshots">organizing screenshots</a> explains the template.</p>`,
      },
      {
        id: 'convert',
        h: 'How to convert WebM to MP4 (and back)',
        html: `<p>If you already have a WebM and need an MP4, you’ll need a converter. Many video editors, media players and dedicated converter apps can open a WebM and export it as MP4. The general steps are the same in most of them:</p>
<ol>
<li><strong>Open or import</strong> the WebM file.</li>
<li><strong>Choose MP4 as the output</strong>, with <strong>H.264</strong> video and <strong>AAC</strong> sound for the widest compatibility.</li>
<li><strong>Keep the resolution and frame rate</strong> the same as the original unless you also want to shrink the file.</li>
<li><strong>Pick a quality setting</strong> that is high enough. Converting re-compresses the video, so each conversion loses a little detail. Convert once, from the original, not from an earlier copy.</li>
<li><strong>Play the new file</strong> all the way through, including the sound, before you delete the original.</li>
</ol>
<p>Converting MP4 to WebM works the same way, with VP9 and Opus as the output codecs.</p>
${callout('ShieldCheck', '<p>Be careful with converter websites. To convert your video they usually upload it to their server, and a screen recording can show emails, customer data and your voice. For anything private, use an app that converts on your own computer. Read <a href="/blog/why-frameshot-keeps-your-screenshots-on-your-device">why FrameShot keeps your files on your device</a> for the same reasoning applied to recording, and our <a href="/privacy">privacy policy</a> for exactly what FrameShot stores.</p>')}
<p>The easiest conversion is the one you never need: if you know the file is going to a slide deck, an editor or an iPhone, record MP4 in the first place.</p>`,
      },
      {
        id: 'faq',
        h: 'Common questions',
        html: `<h3>Is MP4 or WebM better for screen recordings?</h3>
<p>MP4 for anything you share or edit, because it plays almost everywhere. WebM is fine for videos watched in a browser, and it is open and royalty-free. Quality at the same size is similar for typical screen content.</p>
<h3>Why does my screen recording save as WebM?</h3>
<p>Your browser probably can’t write MP4. Chrome records MP4 from version 126 when an H.264 encoder is available; otherwise recorders fall back to WebM. Update Chrome and try again.</p>
<h3>Can I play a WebM file on a Mac or iPhone?</h3>
<p>In Chrome, Firefox and recent Safari, usually yes. QuickTime Player doesn’t open WebM, and support on older iPhones and iPads is patchy. Convert it to MP4 if it needs to play everywhere.</p>
<h3>Does converting WebM to MP4 reduce quality?</h3>
<p>A little, because the video is compressed again. Choose a high quality setting, keep the same resolution, and convert from the original file only once.</p>
<h3>Which format should I use for a GIF?</h3>
<p>Neither: a GIF is its own image format, made from part of a recording. It suits short silent loops. See <a href="/blog/how-to-turn-a-screen-recording-into-a-gif">how to turn a screen recording into a GIF</a>, and <a href="/blog/how-to-record-a-presentation">how to record a presentation</a> for an example of when MP4 matters.</p>`,
      },
    ],
  },

  'how-to-reduce-screen-recording-file-size': {
    intro: `<p>To reduce screen recording file size, record at a lower resolution, use a lower frame rate, record only the tab or window you need instead of the whole screen, and keep recordings short. Those four choices, made before you press record, shrink a file far more than anything you can do afterwards. Use MP4 so you don’t have to convert later, and save GIFs for clips of a few seconds.</p>
<p>This guide explains what makes recordings big, how much each setting matters, and which settings suit chat messages, email attachments and documentation, using FrameShot’s quality presets as the example.</p>`,
    sections: [
      {
        id: 'what-decides',
        h: 'What makes a screen recording file so big?',
        html: `<p>A video file is roughly <strong>bitrate × length</strong>: the amount of data used per second, multiplied by the number of seconds. The bitrate in turn depends on how many pixels each frame has, how many frames there are per second, and how hard the picture is to compress. That gives you five levers:</p>
<table>
<thead><tr><th>Setting</th><th>Effect on file size</th><th>Effect on how it looks</th></tr></thead>
<tbody>
<tr><td><strong>Length</strong></td><td>Very large: twice as long is about twice as big</td><td>None</td></tr>
<tr><td><strong>Resolution</strong></td><td>Large: each step down cuts the pixel count a lot</td><td>Small text gets harder to read</td></tr>
<tr><td><strong>What you share</strong> (tab, window, screen)</td><td>Medium to large: a tab is often smaller than a whole screen</td><td>Less clutter, more focus</td></tr>
<tr><td><strong>Frame rate</strong></td><td>Medium: fewer frames, less data</td><td>Motion looks less smooth</td></tr>
<tr><td><strong>What’s on screen</strong></td><td>Medium: motion and video cost more than still text</td><td>Busy scenes can look blocky at low settings</td></tr>
<tr><td><strong>MP4 or WebM</strong></td><td>Small at the same settings</td><td>Small differences; mostly about compatibility</td></tr>
<tr><td><strong>Sound</strong></td><td>Small compared with the picture</td><td>Turning it off loses the narration</td></tr>
</tbody>
</table>
<p>The rest of this guide goes through each lever, starting with the ones that matter most.</p>`,
      },
      {
        id: 'resolution',
        h: 'Lower the resolution and record less of the screen',
        html: `<p>Resolution is the biggest setting you control. A 4K frame has four times the pixels of a 1080p frame, and 1080p has more than twice the pixels of 720p. More pixels means more data per frame.</p>
<p><a href="/">FrameShot</a> records at 720p, 1080p, 1440p or 4K, and works out the bitrate from the resolution and frame rate you pick, so a lower preset gives a smaller file straight away. The preset is the largest size recorded: if what you share is smaller, it keeps its own size and isn’t scaled up.</p>
<ul>
<li><strong>720p</strong> is enough for most bug reports, quick demos and anything watched in a small chat window.</li>
<li><strong>1080p</strong> is the sensible default for tutorials and presentations that people watch full screen.</li>
<li><strong>1440p and 4K</strong> are worth it only for small text on a large monitor, such as code or spreadsheets, and they make much bigger files.</li>
</ul>
<p><strong>Record less of the screen.</strong> Choosing what to share is a resolution setting in disguise. A Chrome tab is often smaller than your whole screen and leaves out the taskbar, other apps and notifications. Sharing a single tab or window instead of a large monitor can cut the pixel count considerably without making anything less sharp. It’s also the cleaner choice: see <a href="/blog/how-to-record-your-screen-with-audio-in-chrome">recording your screen with audio in Chrome</a> for how sound works with each option.</p>
${callout('Lightbulb', '<p>Make the window smaller rather than the text. Zoom the page in a little with ' + k('Ctrl++') + ' (' + k('Cmd++') + ' on a Mac) and record a smaller window: you get readable text in fewer pixels.</p>')}`,
      },
      {
        id: 'frame-rate',
        h: 'Choose a lower frame rate',
        html: `<p>Frame rate is how many pictures are recorded each second. FrameShot offers 15, 30 and 60 frames per second.</p>
<ul>
<li><strong>15 fps</strong> is fine for slides, documents, settings pages and anything where the screen mostly sits still between clicks. Scrolling and the pointer look a bit less smooth.</li>
<li><strong>30 fps</strong> suits most tutorials and demos, and looks natural for a webcam bubble.</li>
<li><strong>60 fps</strong> is for fast scrolling, animation and games. In FrameShot, going from 30 to 60 fps adds less than double the data, because neighbouring screen frames are so similar, but it still makes the file noticeably bigger.</li>
</ul>
<p>If you aren’t sure, start at 30 fps and drop to 15 for long recordings of mostly static content.</p>`,
      },
      {
        id: 'length',
        h: 'Record shorter: pause, split and retake',
        html: `<p>Length multiplies everything else, so the cheapest way to halve a file is to halve the recording.</p>
<ul>
<li><strong>Pause instead of waiting.</strong> In FrameShot, paused time is left out of the video. Pause while a page loads, while you look for a file or while you think, and none of that dead time ends up in the file.</li>
<li><strong>Split long topics.</strong> Stop at the end of each part and start a new recording for the next. Several short files are easier to send, and viewers can skip to the part they need.</li>
<li><strong>Start close to the action.</strong> Open the right page and prepare your example before you start, so the first seconds aren’t spent navigating. A countdown of 3, 5 or 10 seconds helps.</li>
<li><strong>Retake rather than ramble.</strong> If a take goes wrong, discard it and record again. Discarding deletes all of the recorded data.</li>
</ul>
${callout('Info', '<p>FrameShot doesn’t trim, cut or compress existing videos. Choosing a range is only possible when you export a GIF. Short recordings are the way to get short files.</p>')}`,
      },
      {
        id: 'content',
        h: 'Why what’s on screen changes the file size',
        html: `<p>Video compression works by storing what changed from one frame to the next. When you talk over a still page, very little changes, and the encoder has little to describe. When you scroll quickly, play a video or move through animations, almost every pixel changes in every frame.</p>
<p>Depending on the encoder, heavy motion shows up as a bigger file, as softer and blockier motion, or both. You can help it:</p>
<ul>
<li><strong>Scroll deliberately,</strong> in short steps, rather than flicking through a page.</li>
<li><strong>Pause videos and animations</strong> on the page unless they’re what you’re demonstrating.</li>
<li><strong>Use a plain desktop background</strong> if you share the whole screen; a moving wallpaper changes constantly.</li>
<li><strong>Close busy tabs and apps</strong> that animate in the corner of the screen.</li>
<li><strong>Keep the camera bubble small</strong> if file size matters. Your face moves all the time, and three bubble sizes are available.</li>
</ul>`,
      },
      {
        id: 'format',
        h: 'Does MP4, WebM or GIF make the smallest file?',
        html: `<p><strong>MP4 and WebM:</strong> at the same resolution and frame rate, they come out at a similar size, because the bitrate is set by your settings, not by the container. Choose MP4 for sharing, since it plays almost everywhere and you won’t have to convert it later, which would cost quality. Our full comparison of <a href="/blog/mp4-vs-webm-for-screen-recordings">MP4 vs WebM</a> explains the trade-offs.</p>
<p><strong>GIF:</strong> a GIF is a sequence of images, not real video compression, and it has no sound. For anything longer than a few seconds it is usually much bigger than an MP4 of the same clip. It is still useful, because a GIF plays by itself in places that don’t play video, such as many docs, tickets and READMEs.</p>
<p>FrameShot can turn any part of a recording, up to 60 seconds, into a GIF, and does a lot to keep it small: one steady colour palette, unchanged pixels stored once and identical frames merged. To keep a GIF light:</p>
<ul>
<li>Keep it to a few seconds, showing one action.</li>
<li>Choose a smaller width; FrameShot offers 320 to 800 pixels.</li>
<li>Use a lower frame rate; 10 to 12 fps is plenty for clicks and menus.</li>
</ul>
${fig('gif', 'FrameShot Studio — Player', 'The Export as GIF dialog with a short range selected, a small width and a low frame rate', 'A short range, a modest width and a low frame rate keep GIFs small.')}
<p>Our guide to <a href="/blog/how-to-turn-a-screen-recording-into-a-gif">turning a screen recording into a GIF</a> goes into more detail.</p>`,
      },
      {
        id: 'presets',
        h: 'Practical presets for chat, email and docs',
        html: `<p>Every app sets its own upload limits, and they change, so check the limit where you’re sending. As a starting point:</p>
<table>
<thead><tr><th>Destination</th><th>Format</th><th>Suggested settings</th><th>Keep it</th></tr></thead>
<tbody>
<tr><td><strong>Team chat</strong></td><td>MP4</td><td>720p or 1080p, 30 fps, tab only</td><td>Under a couple of minutes</td></tr>
<tr><td><strong>Email attachment</strong></td><td>MP4</td><td>720p, 15 fps, tab only</td><td>Very short; many services cap attachments at a few tens of megabytes</td></tr>
<tr><td><strong>Bug report or ticket</strong></td><td>MP4, or a GIF for one action</td><td>720p, 15 or 30 fps</td><td>Just the steps to reproduce</td></tr>
<tr><td><strong>Docs, README or help article</strong></td><td>GIF for a loop, MP4 for anything longer</td><td>GIF at 480 to 640 px wide, 10 to 12 fps</td><td>A few seconds per GIF</td></tr>
<tr><td><strong>Video platform or course</strong></td><td>MP4</td><td>1080p, 30 fps</td><td>Size matters less; length matters for viewers</td></tr>
</tbody>
</table>
<p>For bug reports in particular, a short, focused clip beats a long one every time. Our <a href="/blog/better-bug-reports-with-screenshots-and-screen-recordings">bug report guide</a> shows what to capture. And when a still image would do, a screenshot is far smaller than any video: see <a href="/blog/how-to-copy-a-screenshot-to-the-clipboard">how to copy a screenshot to the clipboard</a> for the quickest way to paste one.</p>`,
      },
      {
        id: 'existing',
        h: 'How to shrink a recording you already made',
        html: `<p>If the recording is already made and too big, you have three options, from best to worst:</p>
<ol>
<li><strong>Record it again</strong> with lower settings, if that’s practical. It gives the cleanest result.</li>
<li><strong>Re-encode it</strong> in a video editor or converter app on your computer: lower the resolution, lower the frame rate, or choose a lower quality or bitrate, and export as MP4 with H.264. Trimming the start and end in the same step helps too. Every re-encode loses some detail, so work from the original file.</li>
<li><strong>Send it another way,</strong> for example by uploading the file to a shared drive you already use and sending the link, instead of attaching it.</li>
</ol>
<p>Avoid online compressors for anything private. They upload your video to a server to process it, and screen recordings tend to contain names, emails and other details. FrameShot itself never uploads recordings, as our <a href="/privacy">privacy policy</a> explains.</p>`,
      },
      {
        id: 'faq',
        h: 'Common questions',
        html: `<h3>What is the best resolution for a small screen recording?</h3>
<p>720p for quick demos and bug reports, 1080p when people will watch full screen. Record a tab or window rather than a large monitor to keep the size down without losing sharpness.</p>
<h3>Does a lower frame rate make a screen recording smaller?</h3>
<p>Yes. Fewer frames means less data. 15 fps works for slides and documents; 30 fps is a good default; 60 fps only pays off for fast motion.</p>
<h3>Why is my screen recording so large?</h3>
<p>Usually it’s long, recorded at a high resolution such as 4K, or of the whole screen. Fast scrolling and video playback add more. Lower the preset, share only the tab, and pause instead of waiting.</p>
<h3>Is a GIF smaller than an MP4?</h3>
<p>Only for very short clips at a small width. For anything longer than a few seconds an MP4 is usually much smaller, and it keeps the sound.</p>
<h3>Can FrameShot compress a video after recording?</h3>
<p>No. FrameShot sets the size through its recording settings, and doesn’t re-encode or trim videos afterwards. For a long talk, see <a href="/blog/how-to-record-a-presentation">how to record a presentation</a> for tips on recording in parts.</p>`,
      },
    ],
  },

  'how-to-organize-screenshots': {
    intro: `<p>To organize screenshots, give every file a consistent name that starts with the date, save them into a few predictable folders instead of the desktop, tag or group the ones you’ll need again, and delete the rest once a week. Automatic file names and a searchable library do most of the work, so the routine takes minutes rather than an afternoon.</p>
<p>This guide covers naming conventions, automatic file name templates, download folders, organizing inside FrameShot’s library, finding duplicates, a simple weekly routine, and how to keep private screenshots private.</p>`,
    sections: [
      {
        id: 'naming',
        h: 'How should you name screenshots?',
        html: `<p>A good file name tells you what a screenshot is without opening it, and sorts in a useful order. Default names like “Screenshot 2026-11-16 at 14.05.33” sort by time but say nothing about the content. A simple convention fixes that:</p>
<ul>
<li><strong>Start with the date as year-month-day,</strong> for example <code>2026-11-16</code>. Files then sort in date order in every file manager, and you can find “last March” at a glance.</li>
<li><strong>Add where it came from:</strong> the website, app or project, such as <code>github.com</code> or <code>acme-redesign</code>.</li>
<li><strong>Add what it shows</strong> in two or three words: <code>checkout-total-bug</code>, <code>invoice-october</code>.</li>
<li><strong>Use hyphens instead of spaces,</strong> and avoid characters like <code>/ \\ : * ? " &lt; &gt; |</code>, which aren’t allowed in file names on some systems.</li>
<li><strong>Keep it short.</strong> Very long names get cut off in file lists and in chat previews.</li>
</ul>
<p>Put together: <code>2026-11-16-github.com-checkout-total-bug.png</code>. You won’t name every capture by hand, which is where templates come in.</p>`,
      },
      {
        id: 'templates',
        h: 'Automatic file names with FrameShot templates',
        html: `<p><a href="/">FrameShot</a> names downloads from a template you set once in <strong>Settings → Export &amp; downloads → File name template</strong>. The default is <code>frameshot-{domain}-{date}-{time}</code>, and a live preview under the field shows what a file name will look like. Click a token button to add it to the template.</p>
<table>
<thead><tr><th>Token</th><th>Becomes</th></tr></thead>
<tbody>
<tr><td><code>{date}</code></td><td>The capture date, as YYYY-MM-DD</td></tr>
<tr><td><code>{time}</code></td><td>The capture time, as HH-MM-SS</td></tr>
<tr><td><code>{domain}</code></td><td>The website, such as <code>example.com</code> (without “www.”)</td></tr>
<tr><td><code>{title}</code></td><td>The page title</td></tr>
<tr><td><code>{name}</code></td><td>The capture’s name in the library, including any name you gave it</td></tr>
<tr><td><code>{mode}</code></td><td>How it was captured, such as <code>full</code>, <code>visible</code>, <code>area</code> or <code>element</code>; <code>recording</code> for videos</td></tr>
<tr><td><code>{width}</code>, <code>{height}</code></td><td>The image size in pixels</td></tr>
<tr><td><code>{timestamp}</code></td><td>The exact capture moment as one long number, useful when you capture many in a row</td></tr>
</tbody>
</table>
<p>The template also understands <code>{yyyy}</code>, <code>{mm}</code>, <code>{dd}</code>, <code>{hh}</code>, <code>{min}</code> and <code>{ss}</code> for the individual parts of the date and time. A few useful templates:</p>
<ul>
<li><code>{date}-{domain}-{title}</code> for research and receipts, sorted by date and labelled by site.</li>
<li><code>{domain}-{date}-{time}</code> when you mostly look things up by website.</li>
<li><code>{date}-{name}</code> if you rename captures in the library before downloading.</li>
</ul>
<p>A few details that help: the date and time are when you captured the screenshot, not when you download it. Characters that aren’t allowed in file names are replaced automatically, and empty tokens don’t leave double hyphens behind. Recordings use the same template, with their video extension.</p>`,
      },
      {
        id: 'folders',
        h: 'Where should screenshots be saved?',
        html: `<p>Screenshots pile up wherever they land by default, and every tool has a different default:</p>
<ul>
<li><strong>Windows</strong> saves ${k('Win+PrtScn')} screenshots in <strong>Pictures → Screenshots</strong>, and Snipping Tool can save there automatically too. See <a href="/blog/how-to-screenshot-on-windows">how to screenshot on Windows</a>.</li>
<li><strong>Mac</strong> saves screenshots to the desktop. Press ${k('Cmd+Shift+5')}, click <strong>Options</strong> and pick another folder under <strong>Save to</strong>. See <a href="/blog/how-to-screenshot-on-a-mac">how to screenshot on a Mac</a>.</li>
<li><strong>Chrome</strong> saves downloads to the folder set in <strong>Settings → Downloads</strong>, usually Downloads.</li>
</ul>
<p>In FrameShot, set <strong>Save into a folder inside Downloads</strong> in the same settings section, for example <code>FrameShot</code>, so captures don’t mix with every other download. You can use a nested folder such as <code>FrameShot/Receipts</code>, and switch it when you start a project. If you’d rather decide each time, turn on <strong>Ask where to save each file</strong>.</p>
<p>Keep the folder structure shallow: one folder for screenshots, with a handful of sub-folders by project or purpose, is easier to keep up than a deep tree you’ll stop maintaining after a week.</p>`,
      },
      {
        id: 'library',
        h: 'How to organize screenshots in the FrameShot library',
        html: `<p>Every capture and recording you make with FrameShot is kept in its library, in your browser, before you download anything. That’s where most of the organizing happens:</p>
<ul>
<li><strong>Search.</strong> Press ${k('/')} and type. Search looks through names, page titles, websites, addresses and tags, and typing “recording” finds videos.</li>
<li><strong>Filter by website.</strong> The website filter shows only captures from one site, which is often all you need to find something.</li>
<li><strong>Sort</strong> by newest, oldest, name or size, and switch between a grid of thumbnails and a list.</li>
<li><strong>Rename and tag.</strong> Open a capture’s menu and choose <strong>Details, rename &amp; tags…</strong>. Give it a clear name and add tags separated by commas, such as <code>design, bug-report</code>. Tags are searchable.</li>
<li><strong>Collections.</strong> Click <strong>New collection</strong> in the sidebar for a project, client or topic, then select captures and use <strong>Move to…</strong>. You can also pick a collection in the details dialog. Collections can be renamed or deleted later.</li>
<li><strong>Favourites.</strong> Star the captures you reuse, such as a reference layout or a standard product shot, and find them in the <strong>Favorites</strong> view.</li>
<li><strong>Details.</strong> The details dialog shows the source address, capture mode, size and pixel density, so you can always trace a screenshot back to its page.</li>
</ul>
${fig('library-light', 'FrameShot Studio — Library', 'The FrameShot library with screenshots and recordings in a grid, collections in the sidebar, a search field and a website filter', 'Search, a website filter, collections and favourites, all in one library.', 'library-dark')}
<p>Screenshots taken with other tools can join in: import images with the file picker, paste them, or drag them into the library, then tag and file them like the rest.</p>`,
      },
      {
        id: 'duplicates',
        h: 'Find duplicates and compare versions',
        html: `<p>Repeated captures of the same page are the main source of clutter. FrameShot’s sidebar has a <strong>Duplicates</strong> view that lists screenshots that look the same, found by comparing the images themselves rather than their names. Keep the best one and delete the rest.</p>
<p>When two screenshots are <em>almost</em> the same, such as a page before and after a change, comparing is more useful than deleting. Select exactly two screenshots and click <strong>Compare</strong> to see them side by side, as an overlay, or as a difference image that highlights what changed. It’s a quick way to check a design fix or spot what moved between two versions of a page.</p>`,
      },
      {
        id: 'routine',
        h: 'A simple weekly routine for screenshots',
        html: `<p>Ten minutes once a week keeps a screenshot collection under control. Put it in your calendar for Friday afternoon:</p>
<ol>
<li><strong>Open the library</strong> and sort by newest to see the week’s captures.</li>
<li><strong>Delete the throwaways.</strong> Screenshots you took to paste into a chat once are done. Select them with ${k('Shift')}-click for a range, and press ${k('Delete')}. FrameShot asks you to confirm.</li>
<li><strong>Clear duplicates</strong> from the Duplicates view.</li>
<li><strong>Name and tag what you’ll keep.</strong> A clear name and one or two tags take seconds now and save minutes later.</li>
<li><strong>File them</strong> into the right collection, and star the ones you’ll reuse often.</li>
<li><strong>Archive finished projects.</strong> Select a collection’s captures and export them as a ZIP, or as one combined PDF for screenshots, and keep that file with the project’s other documents.</li>
<li><strong>Check storage.</strong> Sort by size to find the largest items, usually long recordings, and delete or download the ones you no longer need in the library.</li>
</ol>
<p>The same habit works for your downloads folder: anything older than a month that you haven’t opened probably doesn’t need to stay.</p>`,
      },
      {
        id: 'keep-or-delete',
        h: 'Delete what you don’t need, back up what you do',
        html: `<p>The library is a working space, not an archive. It’s stored only in this browser on this computer: it isn’t synced to your other devices, and uninstalling FrameShot or using <strong>Settings → Storage → Clear all local data</strong> removes everything in it. So:</p>
<ul>
<li><strong>Download what you must keep</strong> and store it wherever you keep important files, with your normal backups.</li>
<li><strong>Use ZIP exports</strong> for a batch. Recordings go into the ZIP as their video files.</li>
<li><strong>Delete freely</strong> once a file is safely downloaded. Fewer captures make search faster and the useful ones easier to spot.</li>
<li><strong>Watch the storage meter</strong> in the library, especially if you record video. Screenshots are small; long recordings are not.</li>
</ul>
<p>Files you’ve already downloaded aren’t affected by anything you delete in the library.</p>`,
      },
      {
        id: 'private',
        h: 'Keep private screenshots private',
        html: `<p>Screenshots are often more sensitive than they look: a receipt shows your address, a bug report shows a customer’s email, a chat shows someone else’s messages. Organizing them is also a good moment to check them.</p>
<ul>
<li><strong>Redact before you share.</strong> Use a solid redaction box for passwords, tokens and card numbers. Blur and pixelation can sometimes be reversed for short text. Our <a href="/blog/how-to-blur-or-redact-sensitive-information-in-screenshots">redaction guide</a> explains why.</li>
<li><strong>Apply edits permanently</strong> for captures you keep. FrameShot normally keeps the original under your edits; <strong>Apply edits permanently</strong> replaces it, so the hidden parts no longer exist even in your library.</li>
<li><strong>Know what syncs.</strong> FrameShot’s library stays on your computer, but folders you download into may be synced to a cloud drive by your system or another app. Keep sensitive downloads in a folder that isn’t.</li>
<li><strong>Mind shared computers.</strong> Anyone who uses your Chrome profile can open the library. Delete sensitive captures when you’re done, or use a separate profile.</li>
<li><strong>Give personal captures their own collection,</strong> such as receipts and documents, so you can review and delete them in one go, and so they don’t appear in front of colleagues if you open the library during a screen share.</li>
</ul>
<p>FrameShot uploads nothing and has no accounts; our <a href="/privacy">privacy policy</a> lists exactly what it stores and the one anonymous install count it sends.</p>`,
      },
      {
        id: 'faq',
        h: 'Common questions',
        html: `<h3>What is a good naming convention for screenshots?</h3>
<p>Date first as YYYY-MM-DD, then the site or project, then two or three words about the content, joined with hyphens: <code>2026-11-16-example.com-pricing-page</code>. A file name template can fill in the date and site for you.</p>
<h3>How do I find an old screenshot quickly?</h3>
<p>Search by the website or page title if you remember them, or filter by website and sort by date. In FrameShot, press ${k('/')} and type part of the name, title, address or a tag.</p>
<h3>How do I delete duplicate screenshots?</h3>
<p>Open the Duplicates view in FrameShot’s library, which lists visually identical screenshots, keep the best copy and delete the rest. For files on disk, sorting by date and size helps spot repeats.</p>
<h3>Are screenshots in the FrameShot library backed up?</h3>
<p>No. They are stored only in this browser on this computer and aren’t synced. Download or export anything you want to keep long term.</p>
<h3>Can I organize screenshots taken with other tools?</h3>
<p>Yes. Import them into the library with the file picker, by pasting, or by dragging them in. Want them to look better before you file them? See <a href="/blog/how-to-make-screenshots-look-professional">how to make screenshots look professional</a>, and for menus that need a timer, <a href="/blog/how-to-take-a-delayed-screenshot">how to take a delayed screenshot</a>.</p>`,
      },
    ],
  },
};
