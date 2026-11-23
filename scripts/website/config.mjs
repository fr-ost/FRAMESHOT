/**
 * Website settings. The two values to set:
 *  - SITE_URL: the address the site is served from (used for canonical links,
 *    the sitemap and social previews). Set it to your Vercel or custom domain.
 *  - STORE_URL: the Chrome Web Store listing. Every "Add to Chrome" button opens it,
 *    and /chrome redirects to it permanently.
 * Then run `npm run website` and commit the website/ folder.
 */
export const SITE_URL = (process.env.SITE_URL || 'https://frameshot.uniquelabs.org').replace(/\/+$/, '');
export const STORE_URL = 'https://chromewebstore.google.com/detail/adcgjmghjagflmmndoajdidcopodacac';

export const SITE = {
  name: 'FrameShot',
  /** The default <title>, written for search. */
  title: 'FrameShot: Screen Recorder & Full Page Screenshot for Chrome',
  description:
    'Free Chrome extension to record your screen with sound and webcam, or capture a whole web page in one click. Annotate, blur and share. No watermark, no sign-up.',
  tagline: 'Capture the web. Edit every detail. Free forever.',
  company: 'Unique Labs',
  /** The organization's own website (Organization.url in the structured data). */
  organizationUrl: 'https://www.uniquelabs.org',
  /** Contact address in the Organization's contactPoint and security.txt. */
  email: 'shahriar.bmb@gmail.com',
  /** The version on the Chrome Web Store (SoftwareApplication.softwareVersion). */
  version: '1.0.0',
  developer: 'Shahriar Ahmed',
  developerUrl: 'https://www.shahriarahmed.net',
  telegram: 'https://t.me/igfrostt',
  published: '2026-11-08',
  locale: 'en_US',
  themeColor: '#3ecf8e',
};

