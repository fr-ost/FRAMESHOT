/** Page and article metadata shared by the build and the social-image renderer. */
import { META_A } from './content/posts-a.mjs';
import { META_B } from './content/posts-b.mjs';

/** The first six guides (2026-11-08). Newer guides live in content/posts-a.mjs and posts-b.mjs. */
const FIRST = [
  {
    slug: 'how-to-take-a-full-page-screenshot-in-chrome',
    keywords: ['full page screenshot chrome', 'capture entire web page', 'full page screenshot extension', 'devtools full size screenshot', 'screenshot whole page'],
    title: 'How to Take a Full-Page Screenshot in Chrome (3 Easy Ways)',
    description: 'Capture an entire web page in Chrome with an extension, the built-in DevTools command or Print to PDF, plus tips for sticky headers and very long pages.',
    tag: 'Guide',
    image: 'editor',
    alt: 'A full-page screenshot of a long web page open in the FrameShot editor with arrows and notes',
    date: '2026-11-08',
  },
  {
    slug: 'how-to-record-your-screen-with-audio-in-chrome',
    keywords: ['record screen with audio chrome', 'screen recorder with sound', 'record tab audio', 'record system audio', 'webcam screen recording'],
    title: 'How to Record Your Screen With Audio in Chrome',
    description: 'Record a tab, a window or your whole screen with sound, your microphone and a webcam bubble. What to tick in Chrome’s dialog, and how to fix a silent video.',
    tag: 'Guide',
    image: 'recorder',
    alt: 'The FrameShot screen recorder recording a browser tab with a camera bubble and a live timer',
    date: '2026-11-08',
  },
  {
    slug: 'how-to-blur-or-redact-sensitive-information-in-screenshots',
    keywords: ['blur screenshot', 'redact screenshot', 'hide sensitive information', 'pixelate text', 'censor screenshot'],
    title: 'How to Blur or Redact Sensitive Information in Screenshots',
    description: 'Why blur and pixelation can sometimes be undone, when to use a solid redaction box, and a checklist of details to hide before you share a screenshot.',
    tag: 'Privacy',
    image: 'redact',
    alt: 'A billing form in the FrameShot editor with the email blurred and the card number covered by a black box',
    date: '2026-11-08',
  },
  {
    slug: 'how-to-turn-a-screen-recording-into-a-gif',
    keywords: ['screen recording to gif', 'video to gif', 'make a gif of your screen', 'gif size and frame rate'],
    title: 'How to Turn a Screen Recording Into a GIF',
    description: 'Make small, sharp GIFs from screen recordings: when a GIF beats a video, which size and frame rate to choose, and how to keep the file light.',
    tag: 'Guide',
    image: 'gif',
    alt: 'The FrameShot Export as GIF dialog with a trimmed part of a recording, width and frame-rate options',
    date: '2026-11-08',
  },
  {
    slug: 'why-frameshot-keeps-your-screenshots-on-your-device',
    keywords: ['private screenshot tool', 'screenshot extension privacy', 'local screen recorder', 'chrome extension permissions'],
    title: 'Private by Design: Why FrameShot Keeps Your Files Local',
    description: 'How FrameShot captures and records without uploads or accounts, what each permission is for, what it sends, and how to check it yourself in a minute.',
    updated: '2026-11-10',
    tag: 'Privacy',
    image: 'library-light',
    alt: 'The FrameShot library with screenshots and a recording stored on the computer',
    date: '2026-11-08',
  },
  {
    slug: 'better-bug-reports-with-screenshots-and-screen-recordings',
    keywords: ['bug report template', 'how to write a bug report', 'bug report screenshot', 'screen recording for bug reports'],
    title: 'Better Bug Reports With Screenshots and Short Videos',
    description: 'A practical template for bug reports developers can act on: what to capture, how to annotate it, and when a short screen recording beats a paragraph.',
    tag: 'Workflow',
    image: 'composer',
    alt: 'A screenshot placed on a gradient background with a browser frame in the FrameShot composer',
    date: '2026-11-08',
  },
];

/** Every guide, newest first (the order used on the blog, the home page and in the feed). */
export const POSTS = [...META_A, ...META_B, ...FIRST].sort((a, b) => (b.updated || b.date).localeCompare(a.updated || a.date) || 0);

/** Blog categories, in the order of the filter on /blog. */
export const TAGS = ['Guide', 'Recording', 'Tips', 'Workflow', 'Privacy'];

export const OG_PAGES = [
  { name: 'home', title: 'Free screen recorder &amp; full page screenshots for Chrome', kicker: 'Chrome extension', image: 'editor' },
  { name: 'blog', title: 'Guides for screenshots and screen recording', kicker: 'FrameShot blog', image: 'library-light' },
  { name: 'privacy', title: 'Privacy policy: your captures stay on your device', kicker: 'Privacy', image: 'library-light' },
  { name: 'about', title: 'About FrameShot and its developer', kicker: 'About', image: 'library-light' },
  { name: 'support', title: 'Support FrameShot and keep it free', kicker: 'Free forever', image: 'composer' },
  ...POSTS.map((p) => ({ name: p.slug, title: p.title.replace(/&/g, '&amp;'), kicker: p.tag, image: p.image })),
];
