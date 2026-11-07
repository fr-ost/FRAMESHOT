import { defineUnlistedScript } from 'wxt/utils/define-unlisted-script';
import { installAgent } from '../content/agent';

/**
 * Injected on demand with chrome.scripting.executeScript (activeTab). Not
 * declared in the manifest, so Frameora never runs on pages by itself.
 */
export default defineUnlistedScript(() => {
  installAgent();
});
