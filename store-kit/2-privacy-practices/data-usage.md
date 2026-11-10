# Data usage (Privacy practices tab)

**What user data do you plan to collect from users now or in the future?** Tick **Location** only:

| Category | Collected? |
|---|---|
| Personally identifiable information | No |
| Health information | No |
| Financial and payment information | No |
| Authentication information | No |
| Personal communications | No |
| Location | **Yes**: country only |
| Web history | No |
| User activity | No |
| Website content | No |

Screenshots, recordings (including microphone sound and camera images the user chose to include) and the title and address of captured pages are stored **only on the user's device**, in the user's own library. They are never sent to the developer or anyone else. FrameShot has no usage analytics, ads or accounts.

FrameShot 1.0.1 and later send **anonymous install counts** (see the privacy policy): on install and update, a random install ID made on the device, the FrameShot version, the OS family and the browser language go to the developer's own Cloudflare Worker, and Chrome opens the Worker's uninstall page (random ID and version) on removal. The Worker records the two-letter **country** Cloudflare derives from the request; the IP address is not stored. Users can turn this off in Settings → Privacy.

Why **Location: Yes**: the store defines Location as "region, IP address, GPS coordinates, or information about things near the user's device". A country code is a region, so ticking it is the accurate answer. Nothing else applies: the random ID identifies no person (not PII), and no web history, user activity or website content is sent. (If you would rather answer No everywhere, remove the country column from the Worker first: in `server/telemetry/worker.js`, store `'XX'` instead of `country(req)`.)

The optional Support page only shows donation addresses; FrameShot never sees or processes donations.

**Certifications** (tick all three):

- I do not sell or transfer user data to third parties, outside of the approved use cases.
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

**Privacy policy URL:** host `privacy-policy.html` (in this kit) at a public address, for example `https://www.shahriarahmed.net/frameshot/privacy`, and paste that URL.
