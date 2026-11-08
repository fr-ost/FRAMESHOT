/**
 * Website settings. The two values to set:
 *  - SITE_URL: the address the site is served from (used for canonical links,
 *    the sitemap and social previews). Set it to your Vercel or custom domain.
 *  - STORE_URL: the Chrome Web Store listing, once FrameShot is approved.
 *    Until then every "Add to Chrome" button opens /coming-soon.
 * Then run `npm run website` and commit the website/ folder.
 */
export const SITE_URL = (process.env.SITE_URL || 'https://frameshot.vercel.app').replace(/\/+$/, '');
export const STORE_URL = process.env.STORE_URL || '';

export const SITE = {
  name: 'FrameShot',
  /** The default <title>, written for search. */
  title: 'FrameShot: Free Screen Recorder & Full Page Screenshot',
  description:
    'Free Chrome extension to record your screen with sound and webcam, or capture a whole web page in one click. Annotate, blur and share. No watermark, no sign-up.',
  tagline: 'Capture the web. Edit every detail. Free forever.',
  company: 'Unique Labs',
  developer: 'Shahriar Ahmed',
  developerUrl: 'https://www.shahriarahmed.net',
  telegram: 'https://t.me/igfrostt',
  published: '2026-11-08',
  locale: 'en_US',
  themeColor: '#4f46e5',
};

/** Where "Add to Chrome" goes: the store listing once it is known, else the coming-soon page. */
export const INSTALL_HREF = STORE_URL || '/chrome';
export const INSTALL_TARGET = STORE_URL ? STORE_URL : '/coming-soon';
