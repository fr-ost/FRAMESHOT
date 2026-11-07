# Frameora: Competitor & Brand Research

*Prepared for Unique Labs, 2026-11-07. Internal working document. It is not legal advice.*

---

## 1. Research method, date and limitations

**Date:** 2026-11-07. All ratings and user counts below are figures I **saw in search-engine results on 2026-11-07**. The listing snapshot behind a figure may be older than that, so re-check before quoting one publicly.

**Method:** About 50 web searches covering Chrome Web Store (CWS) listings, Firefox Add-ons (AMO) reviews, vendor sites, review aggregators (G2, Capterra, AlternativeTo), extension trackers (extscope, chromeboard), tech press, security research and third-party trademark aggregators (Justia, Markinton, trademarkdir).

**Limitations (please read):**
- **I could not open pages directly.** This session's network policy blocked page fetching. Requests to `frameora.com` and `dns.google` failed at DNS resolution, and shell `curl` was refused by the proxy. So every finding comes from search-engine snippets and summaries, not from my own reading of the full pages.
- **I could not query any trademark office database** (USPTO, EUIPO, WIPO Global Brand Database) or WHOIS. GitHub user and org lookups were also blocked.
- Many "alternative to X" pages are written by competing vendors (SuperchargeBrowser, ScreenSnap, fullpagecapture.com). I label their claims as vendor claims.
- I did not install or test any competitor. Nothing here is a hands-on quality comparison.
- Wherever sources disagreed or a claim rests on a single weak source, I marked it **(unverified)**.

---

## 2. Competitor overview

### 2.1 Summary table

| Product | Capture modes (reported) | Editor / export | Account / cloud model | Pricing (reported) | Popularity snapshot (seen 2026-11-07) |
|---|---|---|---|---|---|
| **GoFullPage** | Full page (scroll + stitch); iframe capture needs extra optional permissions | PNG/PDF in free tier (reported by third parties); editor, crop and annotation are Premium | No account for the free tier; the developer says no data is collected | Premium about $1/mo or $12/yr (unverified) | About 11M users ([Android Authority](https://www.androidauthority.com/chrome-gofullpage-extension-web-store-3698292/)); 4.9 from about 84K ratings ([extscope](https://extscope.org/extension/fdpohaocaechififmbbbbbknoalclacl)). **Pulled from CWS in Aug 2026** (see notes) |
| **FireShot** | Entire page, visible area, selection | PNG, JPEG, PDF; advanced, searchable PDF and editor in Pro | Vendor says local and works offline; optional user-initiated uploads (FTP, social) | Pro lifetime $59.95 list, $39.95 promo ([getfireshot.com](https://www.getfireshot.com/buy.php)) | 4.8 from about 49.4K ratings ([CWS](https://chromewebstore.google.com/detail/mcbpblocgmgfnpjjppndjkmgjaogfceg)) |
| **Awesome Screenshot** | Full page, visible, selected area, delayed, desktop; screen recording | Annotation, blur (reported), PNG/JPG/PDF | Cloud account central for recordings and sharing | Free tier with quotas; paid about $2–6/mo (unverified, aggregators disagree) | 4.7 from about 29K ratings, "Featured" ([CWS](https://chromewebstore.google.com/detail/awesome-screen-recorder-s/nlipoenfbbikpbjkfpfillcgkoblgpmj)); vendor claims 3M+ users ([site](https://awesomescreenshot.com/)) |
| **Lightshot** | Drag-select area (full-page scrolling unverified) | Basic markup; save, copy, upload | Uploads to the vendor's prnt.sc host | Free | 4.4 from about 6.9K ratings, 2M users ([CWS](https://chromewebstore.google.com/detail/lightshot-screenshot-tool/mbniclmhobmnbdlbpiphghaielnnpgdp)) |
| **Nimbus Capture / FuseBase** | Full page, area, recording | Annotation; blur and watermark options in paid tiers (unverified) | Rebranded into the FuseBase workspace; login reportedly required (vendor-competitor claim) | Pro about $5/user/mo ([Capterra](https://www.capterra.com/p/234432/Nimbus-Capture/)) or about $60/yr (unverified) | Successor "FuseBase Pro" listing: 3.3 from 30 ratings, about 10K users ([CWS](https://chromewebstore.google.com/detail/fusebase-pro/fddbloohgcjopkmnjdeodjcfbgiimpcn)) |
| **Scrnli** | Full page, visible, selected area; tab, screen and desktop recording | Basic annotation, video conversion | Listing says it collects no personal data | Free; no paid tier found | About 1M users, about 9.3K ratings ([CWS](https://chromewebstore.google.com/detail/scrnli-screen-recorder-sc/ijejnggjjphlenbhmjhhgcdpehhacaal)) |
| **"PageSnapper"** | No product with this exact name found. Several unrelated "PageSnap" listings exist (see notes) | Varies | Varies | One variant: PNG free, PDF Pro | Very small |
| **"Snapora"** | **No product found** under this name | n/a | n/a | n/a | n/a |
| **SuperchargeCapture** (other) | Full page, visible, region, element; recording | Editor; PNG/JPG/WebP; PDF built on-device | Vendor says local (OPFS), no account | Vendor says there is no paid tier | 5.0 from 2 ratings, about 170 users ([CWS](https://chromewebstore.google.com/detail/gebkchfkcnjdflkfdimabihllibgcdhp)) |
| **ScreenPal** (other) | Screenshot plus recorder (full-page scrolling unverified) | Image and video editor | Account-based hosting | Free tier reportedly capped at 15-minute recordings; watermark status disputed | Not found |
| **Built-ins: Edge Screenshot / Chrome DevTools** (other) | Edge: full page, area. DevTools: "Capture full size screenshot" | Edge: light annotation. DevTools: flat PNG only | No extension needed | Free | n/a |

### 2.2 Per-product notes

- **GoFullPage.** The category leader for one-click full-page capture. Its developer documents a permissions model where `tabs`, `webNavigation` and `<all_urls>` are requested only when a page with iframes is captured ([GoFullPage blog, 2025-09-02](https://blog.gofullpage.com/2025/09/02/your-privacy-our-priority-a-guide-to-gofullpages-permissions)). Premium reportedly adds the editor, cropping, URL/date stamps and smarter PDF splitting ([MajorGeeks](https://www.majorgeeks.com/files/details/gofullpage.html); price unverified). **In mid-August 2026 it was removed from the CWS and disabled for some users** with a policy-violation warning. Team members said on Reddit that the cause was copyright, not malware ([Android Authority](https://www.androidauthority.com/chrome-gofullpage-extension-web-store-3698292/), [Mezha](https://mezha.ua/en/news/chrome-poznachiv-populyarne-rozshirennya-gofullpage-yak-nebezpechne-314168/), [AndroidWorld](https://androidworld.nl/nieuws/chrome-zet-dat-deze-door-11-miljoen-mensen-gebruikte-extensie-onveilig-is/)). Whether it has been restored is **unverified**. Edge users reportedly kept access.
- **FireShot.** A long-running tool spanning Chrome, Firefox and Safari. Pro covers advanced PDF (links, searchable text), batch capture and capture history ([buy page](https://www.getfireshot.com/buy.php)). The Firefox listing says captures stay local ([AMO](https://addons.mozilla.org/en/firefox/addon/fireshot/)). The Chrome listing advertises optional uploads to third-party services. G2 shows 4.4 from 17 reviews ([G2](https://www.g2.com/products/fireshot/reviews)).
- **Awesome Screenshot.** A capture, record and share platform with a cloud workspace. Its help center describes free-plan quotas ([support](https://support.awesomescreenshot.com/hc/en-us/articles/57946286263833-Can-I-use-Awesome-Screenshot-for-free)). In 2014 it was criticized for collecting clickstream data without a clear opt-out ([gHacks](https://www.ghacks.net/2014/08/25/chromes-awesome-screenshot-extension-turns-spyware-here-are-alternatives/)). I found no recent equivalent finding.
- **Lightshot.** Fast area-select capture with a one-click upload. Press and researchers report that prnt.sc share URLs use short IDs that can be enumerated, which has exposed sensitive images ([WIRED mirror](https://wirednews.pages.dev/story/lightshot-chrome-screenshot-app), [codegenes](https://www.codegenes.net/blog/lightshot-screenshot-tool-download/)). AlternativeTo notes it has no OCR or layers ([AlternativeTo](https://alternativeto.net/software/lightshot/about)).
- **Nimbus / FuseBase.** Nimbus Capture was folded into the FuseBase workspace brand ([toolfinder](https://toolfinder.co/news/fusebase-announcement)). A competitor's review says the old extension was replaced by a new listing and that some users lost saved screenshots ([ScreenSnap](https://www.screensnap.pro/blog/nimbus-screenshot-review); vendor-competitor source, unverified).
- **Scrnli.** A free recorder-first tool with screenshot modes and basic annotation ([CWS](https://chromewebstore.google.com/detail/scrnli-screen-recorder-sc/ijejnggjjphlenbhmjhhgcdpehhacaal)).
- **PageSnap variants.** Several unrelated listings share the name. One (ExtensionTools) is local PNG only with no account ([CWS](https://chromewebstore.google.com/detail/cjklplcljcalmjneoiefjnkfaigcanpb)). Another offers PNG free and PDF in a Pro tier ([CWS](https://chromewebstore.google.com/detail/jcmdpkklahemkbdjfoldjhbcnplmeknl)).
- **The new local-first wave.** A growing set of small extensions now market the same promises Frameora plans to make: no account, local processing, sticky headers captured once, inner scrollers expanded. Examples include SuperchargeCapture, "Full Page Screenshot" ([CWS](https://chromewebstore.google.com/detail/egidbengabbikhopmaeojgaanedccoko)), LongShot ([CWS](https://chromewebstore.google.com/detail/ghcociciipaofbeikmebgmhpngldohmg)), Full Page Capture ([CWS](https://chromewebstore.google.com/detail/jpbfmcijhlgabgokjcfafhfjiehfdjgd)) and the open-source OpenCapture and OpenScreenShot ([AlternativeTo](https://alternativeto.net/software/opencapture/about/)). Most have tiny user bases, and their claims are self-reported.
- **OCR.** I found no evidence that GoFullPage, FireShot, Awesome Screenshot or Nimbus ship OCR. OCR exists as separate single-purpose extensions, for example one listing with about 20K users and a 3.2 rating ([CWS](https://chromewebstore.google.com/detail/screenshot-to-textocr-ima/mpfhimfooelblffmiddjmpnpndeldikg)). Absence in search results does not prove absence in the product.

---

## 3. Competitor strengths

1. **Trust built over many years.** GoFullPage, FireShot and Lightshot have millions of users and tens of thousands of ratings, mostly 4.4 to 4.9. A new entrant cannot match that quickly.
2. **One-click simplicity.** GoFullPage (one click for the full page) and Lightshot (one drag for an area) set the bar for speed. Reviewers praise ease of use above features.
3. **Breadth beyond screenshots.** Awesome Screenshot, Scrnli, ScreenPal and Nimbus bundle screen recording, desktop capture and share links. Frameora offers none of these.
4. **Mature PDF output.** FireShot Pro offers searchable PDFs with working links. That is a real capability gap for image-only PDF exporters.
5. **Cross-browser reach.** FireShot, Lightshot and Awesome Screenshot ship on Firefox and other browsers. GoFullPage stayed usable on Edge during its Chrome removal.
6. **Collaboration.** Cloud tools (Awesome Screenshot, FuseBase) offer team workspaces and integrations such as Jira and Slack, which some buyers need.

---

## 4. Common limitations

- **Core features behind paywalls.** Editors, annotation, blur, PDF or long captures are often gated: GoFullPage Premium, FireShot Pro, the PageSnap PDF Pro tier, FuseBase Pro.
- **Cloud-first architecture.** Sharing, history and sometimes recording assume an account and vendor storage (Awesome Screenshot, FuseBase, Lightshot uploads).
- **Fragile full-page stitching.** The same failure modes come up across tools and guides:
  - fixed or sticky headers repeated in every frame;
  - lazy-loaded content left blank;
  - pages whose real scroller is an inner panel come out as a single screen. A how-to guide reports that Edge's full-page mode works only when the page body scrolls ([HandsOnTek](https://handsontek.net/take-full-page-screenshot-using-microsoft-edge/));
  - very tall pages silently cut off at browser canvas limits, around 16,384 px on many systems by one vendor's account, with other figures in a [Mozilla bug](https://bugzilla.mozilla.org/show_bug.cgi?id=1853295) (exact limits unverified).
- **Speed ceiling.** Since Chrome 92, `captureVisibleTab` is limited to about 2 calls per second, and the limit cannot be raised ([chromium-extensions group](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/sQUlaHXjlhY)). Every scroll-and-stitch extension shares this bound, so speed claims should be modest.
- **Thin local organization.** Outside FireShot Pro's capture history, I found little evidence of rich local libraries (tags, collections, duplicate detection) in the major tools. Organization usually lives in the cloud. This is an inference from gaps in the results, so treat it as unverified.
- **Broad or sensitive permissions.** A tracker flags Lightshot as requesting sensitive permissions ([extscope](https://extscope.org/extension/mbniclmhobmnbdlbpiphghaielnnpgdp)). GoFullPage needs `<all_urls>` for iframe capture, although only optionally.

---

## 5. User pain points (grouped)

| Theme | What users and press report (paraphrased) | Sources |
|---|---|---|
| **Paywalls and upsell pressure** | Firefox reviewers complain about paying to keep screenshotting, and about heavy pressure to upgrade. Nimbus/FuseBase users objected to the pricing shift. | [AMO FireShot 1-star](https://addons.mozilla.org/en-US/firefox/addon/fireshot/reviews/?score=1), [AMO Awesome Screenshot](https://addons.mozilla.org/fr/firefox/addon/screenshot-capture-annotate/reviews/814894), [ScreenSnap](https://www.screensnap.pro/blog/nimbus-screenshot-review) |
| **Watermarks and self-promotion** | A FireShot reviewer objected to vendor branding printed on exported PDF pages with no way to turn it off (current status unverified). Free-tier watermarks on ScreenPal are disputed. "No watermark" is now a common selling point, which suggests real demand. | [AMO FireShot](https://addons.mozilla.org/en-US/firefox/addon/fireshot/reviews/?score=1), [SuperchargeBrowser](https://www.superchargebrowser.com/library/best-no-watermark-screenshot-extensions-chrome/) |
| **Forced accounts and cloud lock-in** | Reviews object to login requirements (an older Awesome Screenshot review) and to recordings that must go through a cloud account. FuseBase reportedly needs a login to capture. | [AMO Awesome Screenshot](https://addons.mozilla.org/fr/firefox/addon/screenshot-capture-annotate/reviews/814894), [SuperchargeBrowser on FuseBase](https://www.superchargebrowser.com/library/nimbus-screenshot-alternative-fusebase/) |
| **Privacy and trust** | Past clickstream collection (Awesome Screenshot, 2014). Enumerable public share links (Lightshot). Screenshot-adjacent extensions turned malicious after a change of ownership (ShotBird, 2026). Reviewers ask for open source so claims can be audited (FireShot). | [gHacks](https://www.ghacks.net/2014/08/25/chromes-awesome-screenshot-extension-turns-spyware-here-are-alternatives/), [WIRED mirror](https://wirednews.pages.dev/story/lightshot-chrome-screenshot-app), [The Hacker News](https://thehackernews.com/2026/03/chrome-extension-turns-malicious-after.html), [Monx Research](https://monxresearch-sec.github.io/shotbird-extension-malware-report) |
| **Broken full-page results** | Repeated sticky headers, blank lazy-loaded areas, inner scroll containers not captured, long pages truncated, and slow captures or freezes on large pages. | [SuperchargeBrowser explainer (vendor)](https://www.superchargebrowser.com/features/full-page-screenshot/), [Mozilla support](https://support.mozilla.org/tn/questions/1263127), [AMO FireShot](https://addons.mozilla.org/en-US/firefox/addon/fireshot/reviews/?score=1), [itechguides](https://www.itechguides.com/is-gofullpage-safe-for-screenshots-of-private-web-pages/) |
| **Continuity and data loss** | GoFullPage was disabled for users overnight. The Nimbus listing was replaced, and some users reportedly lost screenshots. A G2 reviewer reported failed saves in GoFullPage. | [Android Authority](https://www.androidauthority.com/chrome-gofullpage-extension-web-store-3698292/), [ScreenSnap](https://www.screensnap.pro/blog/nimbus-screenshot-review), [G2](https://www.g2.com/products/gofullpage/reviews) |

---

## 6. Differentiation opportunities

1. **Privacy that can be checked, not just promised.** Most competitors' privacy statements are self-declared, and reviewers notice. A CSP that blocks network connections from extension pages, plus no host permissions, is something a technical user can confirm in the manifest. Publishing the source or reproducible builds would make it fully auditable.
2. **Honest long-page handling.** Splitting into parts or scaling down, and *telling the user*, directly answers the silent-truncation complaint.
3. **The whole toolkit free.** The editor, flattened redaction, composer, multi-page PDF, ZIP and combined PDF are the features competitors gate. Offering all of them free with no watermark addresses the top two pain themes.
4. **A local library that is a real product.** Search, collections, tags and duplicate detection without the cloud is uncommon in the products reviewed (unverified). Pairing it with an explicit backup is the opportunity (see 7.3).
5. **Robustness on modern app layouts.** App-shell detection, nested scrollers and horizontal overflow target known failure modes. Built-in tools reportedly handle these poorly (see Edge above). Note, though, that several small entrants now claim the same things.
6. **Stability and stewardship.** After the GoFullPage removal and the ShotBird ownership-transfer malware, a public commitment on ownership, updates and permissions is a trust differentiator.

---

## 7. Frameora product strategy

### 7.1 Positioning (draft)
"Free, private, local-first screenshots for people who capture sensitive pages: full-page capture that tells you the truth, an editor with real redaction, and a library that never leaves your device." Primary audiences: QA and support engineers, designers, PMs, compliance and legal staff, journalists and researchers, and anyone barred from cloud screenshot tools.

### 7.2 Where Frameora can credibly lead (verifiable at launch)
- **No account, no paid tier, no watermark, no ads, no telemetry.** These are binary claims that are easy to verify.
- **Minimal permissions** (`activeTab`, `scripting`, `storage`, `unlimitedStorage`, `downloads`, `contextMenus`) and a network-blocking CSP. Ship a plain-language "What Frameora can and can't do" page that maps each permission to a feature.
- **Feature completeness in the free product.** Show it with a factual feature matrix, without disparaging rivals.

### 7.3 Where claims must wait for evidence
- **Do not claim "best" or "more reliable" full-page capture** until it has been benchmarked. Build a public test corpus: sticky and fixed headers, lazy-load pages, app shells with nested scrollers, horizontal overflow, very long pages, high-DPI screens, pages with iframes. Publish pass/fail results, including failures.
- **Test the `activeTab`-only trade-off.** Without host permissions, scripting into cross-origin iframes is not possible. Element picking or scroll-container capture inside embedded third-party frames may therefore be limited. Document this as a deliberate privacy trade-off if testing confirms it.
- **Make the PDF claim precise.** Image-based multi-page PDF is not the same as FireShot Pro's searchable PDF with links. Say "image PDF" until text and links are supported.
- **Redaction guidance.** Pixelation and blur of text can sometimes be reversed by known tools ([Depix](https://github.com/beurtschipper/depix)). Recommend solid redaction for passwords and IDs in the UI, and consider making it the default for text.
- **Library durability.** Chrome generally deletes an extension's IndexedDB on uninstall (per [Mozilla bug discussion](https://bugzilla.mozilla.org/show_bug.cgi?id=1350018) and [Chromium source](https://chromium.googlesource.com/git/chromium/+/trunk/chrome/browser/extensions/data_deleter.h); verify on current Chrome). Given the Nimbus data-loss complaints, add a prominent "Export/back up library" flow, an onboarding note, and a restore path.

### 7.4 Gaps to acknowledge rather than hide
These are absent from the current scope:
- screen or video recording;
- desktop and window capture;
- OCR;
- share links and team workspaces;
- non-Chromium browsers.

Users who need these will choose Awesome Screenshot, Scrnli, ScreenPal or FuseBase. Local OCR (bundled WASM, compatible with the CSP) is a plausible future differentiator, because the major tools reviewed do not appear to offer it (unverified).

### 7.5 Trust and sustainability
- Publish how "free forever" is funded, and a no-sale/no-transfer pledge, or at minimum a pledge to announce any ownership change.
- Keep the CWS privacy disclosures, the listing text and actual behavior identical.
- The GoFullPage removal reportedly involved a copyright complaint. Clear the brand (Section 8) and use only original assets before launch.

---

## 8. Brand availability verification: "Frameora"

> **Headline finding:** I found **no exact-name use of "Frameora"** on the web, the Chrome Web Store, app stores or the trademark aggregators I could reach. That does **not** mean the name is legally available. The most notable risk is that the registered mark **FRAMEO** (frameo ApS, Denmark) is fully contained in the first six letters of FRAMEORA and covers photo-related software in Class 9. I rate this as a **moderate risk that needs counsel's review**, not a confirmed conflict. No other serious conflict was found.

### 8.1 Findings

| Check | Result | Confidence |
|---|---|---|
| Exact "Frameora" web search | No product, company or extension found. The engine returned near-matches only. | Medium (search only) |
| Chrome Web Store | No "Frameora" listing found. Many "frame"-named screenshot tools exist: FrameShot, Frameshot, Frame Screenshot, Screenshot Framer, FramedShot ([example](https://chromewebstore.google.com/detail/frameshot/gjikiiejollodfdbpalpnfcfmfphjaaf)) | Medium |
| **FRAMEO** | Registered US marks owned by frameo ApS: Reg. 6383020 (Classes 9 and 42, registered 2021) and Reg. 7483875 (Classes 9, 38, 42 and 45, registered 2024), covering digital photo frames and software for viewing, sharing and editing photos ([Justia](https://trademarks.justia.com/792/94/frameo-79294579.html), [Markinton](https://markinton.com/trademark/frameo-79363439)). The company reports 20M+ app downloads ([Frameo roadmap](https://www.frameo.com/roadmap)). | Medium (aggregators, not TSDR) |
| **FRAMORA** | Two pending US applications: Serial 99613756 (Class 16, paintings and posters; applicant reportedly in Xiamen) and Serial 99515071 (Class 26, fancy goods) ([Justia](https://trademarks.justia.com/996/13/framora-99613756.html), [Markinton](https://markinton.com/trademark/framora-99515071)). Also "Framora Studio" (Framer website templates, [Framer](https://www.framer.com/marketplace/templates/framora/)) and an iOS app listed as "AI Picture Frame – Framora AI" ([AppFollow](https://apps.appfollow.io/ios/ai-picture-frame-framora-ai/6752937087?country=us); details unverified). | Medium |
| **Framera** | iOS app "Frame Grabber – Framera" (extracts stills from video) ([App Store](https://apps.apple.com/app/id6741170141)). | Medium |
| Frameorra / Frameoria / Framiora | No results. | Low–medium |
| Domains (.com, .app, .io) | **Not verified.** The fetch of frameora.com failed at DNS, but other hosts failed the same way under this session's network policy, so this proves nothing. No indexed content was found for frameora.com. WHOIS was not possible. | Low |
| Social handles | No indexed Frameora accounts found on Instagram, X or GitHub. Direct handle checks were not possible. | Low |
| USPTO / EUIPO / WIPO | **Not queried.** Programmatic access was unavailable. Only third-party US aggregators were seen, and none showed FRAMEORA. EU, UK and other registers were not checked at all. | n/a |

### 8.2 Risk assessment
- **FRAMEO (moderate).** Visually and aurally, "Frameora" begins with the whole FRAMEO mark. Both marks cover image-related downloadable software (Class 9). Differences that may help: the goods differ (photo-frame ecosystem vs. browser screenshot tool), the pronunciation and stress differ ("FRAME-ee-oh" vs. "frame-OR-ah"), and "frame" is a common term in this space. Only counsel can judge likelihood of confusion, including in the EU, where frameo ApS is based.
- **FRAMORA filings (low).** These cover different classes (16 and 26). The Framora AI iOS app, if it is photo software, is closer and deserves a check.
- **Crowded "Frame-" prefix (distinctiveness).** Many screenshot products begin with "Frame". That lowers the risk of any single conflict, but it also makes the descriptive part weak. Distinctiveness rests on the "-ora" ending, and users may confuse Frameora with FrameShot-type tools in search results.

### 8.3 Recommended next steps
1. Commission a **formal clearance search by trademark counsel** covering US (USPTO), EU (EUIPO), UK, WIPO Madrid and the planned launch markets, in Classes 9 and 42. Include FRAMEO specifically.
2. Run a **manual search** on [USPTO Trademark Search](https://tmsearch.uspto.gov/), [EUIPO eSearch](https://euipo.europa.eu/eSearch/) and [WIPO Global Brand Database](https://branddb.wipo.int/) for FRAMEORA, FRAMORA, FRAMEO*, and phonetic variants.
3. **Check WHOIS and registrars** for frameora.com, .app and .io, and secure the chosen domains and handles before announcing.
4. Re-search the **Chrome Web Store, Edge Add-ons and app stores** right before publishing.
5. Prepare a **fallback name**, and consider filing an application once the name is cleared.

---

## 9. Sources

- https://www.androidauthority.com/chrome-gofullpage-extension-web-store-3698292/
- https://mezha.ua/en/news/chrome-poznachiv-populyarne-rozshirennya-gofullpage-yak-nebezpechne-314168/
- https://androidworld.nl/nieuws/chrome-zet-dat-deze-door-11-miljoen-mensen-gebruikte-extensie-onveilig-is/
- https://techora.ru/news/chrome-udalil-rasshirenie-gofullpage-s-11-2026-08-13
- https://extscope.org/extension/fdpohaocaechififmbbbbbknoalclacl
- https://blog.gofullpage.com/2025/09/02/your-privacy-our-priority-a-guide-to-gofullpages-permissions
- https://www.majorgeeks.com/files/details/gofullpage.html
- https://www.g2.com/products/gofullpage/reviews
- https://www.itechguides.com/is-gofullpage-safe-for-screenshots-of-private-web-pages/
- https://www.getfireshot.com/buy.php
- https://chromewebstore.google.com/detail/mcbpblocgmgfnpjjppndjkmgjaogfceg
- https://addons.mozilla.org/en/firefox/addon/fireshot/
- https://addons.mozilla.org/en-US/firefox/addon/fireshot/reviews/?score=1
- https://www.g2.com/products/fireshot/reviews
- https://chromewebstore.google.com/detail/awesome-screen-recorder-s/nlipoenfbbikpbjkfpfillcgkoblgpmj
- https://awesomescreenshot.com/
- https://support.awesomescreenshot.com/hc/en-us/articles/57946286263833-Can-I-use-Awesome-Screenshot-for-free
- https://addons.mozilla.org/addon/screenshot-capture-annotate/
- https://addons.mozilla.org/fr/firefox/addon/screenshot-capture-annotate/reviews/814894
- https://www.ghacks.net/2014/08/25/chromes-awesome-screenshot-extension-turns-spyware-here-are-alternatives/
- https://chromewebstore.google.com/detail/lightshot-screenshot-tool/mbniclmhobmnbdlbpiphghaielnnpgdp
- https://extscope.org/extension/mbniclmhobmnbdlbpiphghaielnnpgdp
- https://wirednews.pages.dev/story/lightshot-chrome-screenshot-app
- https://www.codegenes.net/blog/lightshot-screenshot-tool-download/
- https://alternativeto.net/software/lightshot/about
- https://addons.mozilla.org/addon/lightshot/
- https://www.capterra.com/p/234432/Nimbus-Capture/
- https://www.screensnap.pro/blog/nimbus-screenshot-review
- https://www.superchargebrowser.com/library/nimbus-screenshot-alternative-fusebase/
- https://toolfinder.co/news/fusebase-announcement
- https://chromewebstore.google.com/detail/fusebase-pro/fddbloohgcjopkmnjdeodjcfbgiimpcn
- https://chromewebstore.google.com/detail/scrnli-screen-recorder-sc/ijejnggjjphlenbhmjhhgcdpehhacaal
- https://chromewebstore.google.com/detail/cjklplcljcalmjneoiefjnkfaigcanpb
- https://chromewebstore.google.com/detail/jcmdpkklahemkbdjfoldjhbcnplmeknl
- https://chromewebstore.google.com/detail/gebkchfkcnjdflkfdimabihllibgcdhp
- https://www.superchargebrowser.com/capture/
- https://www.superchargebrowser.com/features/full-page-screenshot/
- https://www.superchargebrowser.com/library/best-no-watermark-screenshot-extensions-chrome/
- https://www.superchargebrowser.com/library/screenpal-alternative-no-watermark/
- https://chromewebstore.google.com/detail/egidbengabbikhopmaeojgaanedccoko
- https://chromewebstore.google.com/detail/ghcociciipaofbeikmebgmhpngldohmg
- https://chromewebstore.google.com/detail/jpbfmcijhlgabgokjcfafhfjiehfdjgd
- https://alternativeto.net/software/opencapture/about/
- https://chromewebstore.google.com/detail/screenshot-to-textocr-ima/mpfhimfooelblffmiddjmpnpndeldikg
- https://handsontek.net/take-full-page-screenshot-using-microsoft-edge/
- https://bugzilla.mozilla.org/show_bug.cgi?id=1853295
- https://support.mozilla.org/tn/questions/1263127
- https://groups.google.com/a/chromium.org/g/chromium-extensions/c/sQUlaHXjlhY
- https://thehackernews.com/2026/03/chrome-extension-turns-malicious-after.html
- https://monxresearch-sec.github.io/shotbird-extension-malware-report
- https://github.com/beurtschipper/depix
- https://bugzilla.mozilla.org/show_bug.cgi?id=1350018
- https://chromium.googlesource.com/git/chromium/+/trunk/chrome/browser/extensions/data_deleter.h
- https://trademarks.justia.com/792/94/frameo-79294579.html
- https://trademarks.justia.com/owners/frameo-aps-4545541/
- https://markinton.com/trademark/frameo-79363439
- https://www.frameo.com/roadmap
- https://trademarks.justia.com/996/13/framora-99613756.html
- https://markinton.com/trademark/framora-99613756
- https://markinton.com/trademark/framora-99515071
- https://www.framer.com/marketplace/templates/framora/
- https://apps.appfollow.io/ios/ai-picture-frame-framora-ai/6752937087?country=us
- https://apps.apple.com/app/id6741170141
- https://chromewebstore.google.com/detail/frameshot/gjikiiejollodfdbpalpnfcfmfphjaaf
- https://chromewebstore.google.com/detail/ffgibilndpalajenhfmaojljjgcihggl
- https://tmsearch.uspto.gov/
- https://euipo.europa.eu/eSearch/
- https://branddb.wipo.int/
