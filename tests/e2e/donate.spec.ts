/** The optional Donate page: reachable from the library and popup, exact addresses, working copy, no network use. */
import { expect, test } from './harness';
import { WALLETS } from '../../src/core/donate';

test('the Donate page shows each wallet with its QR code and copies the exact address', async ({ ext }) => {
  await ext.context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const page = await ext.context.newPage();
  await page.goto(`chrome-extension://${ext.extId}/studio.html#/`);
  await page.getByTestId('library-donate').click();
  await page.waitForURL(/#\/donate$/);
  await expect(page.getByRole('heading', { name: /Keep FrameShot free for everyone/ })).toBeVisible();
  for (const w of WALLETS) {
    const card = page.getByTestId(`wallet-${w.id}`);
    await expect(page.getByTestId(`wallet-${w.id}-address`)).toHaveText(w.address);
    // The QR code and logos are bundled images that load (no network).
    const loaded = await card.locator('img').evaluateAll((imgs) => imgs.every((i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0));
    expect(loaded, w.id).toBe(true);
    await page.getByTestId(`wallet-${w.id}-copy`).click();
    await expect(page.getByTestId(`wallet-${w.id}-copy`)).toHaveText('Copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(w.address);
  }
  // "Donate now" scrolls to the addresses.
  await page.locator('#fr-donate-scroll').evaluate((el) => el.scrollTo(0, 0));
  await page.getByTestId('donate-now').click();
  await expect(page.locator('#wallets')).toBeInViewport();
  await page.getByRole('button', { name: 'Library' }).click();
  await page.waitForURL(/#\/$/);
  await page.close();

  // The popup links here too.
  const popup = await ext.context.newPage();
  await popup.goto(`chrome-extension://${ext.extId}/popup.html`);
  await expect(popup.getByTestId('popup-donate')).toBeVisible();
  await popup.close();
});

test('the developer is credited with a photo and a link to www.shahriarahmed.net', async ({ ext }) => {
  for (const route of ['/settings', '/welcome']) {
    const page = await ext.context.newPage();
    await page.goto(`chrome-extension://${ext.extId}/studio.html#${route}`);
    const card = page.getByTestId('developer-card');
    await card.scrollIntoViewIfNeeded();
    await expect(card.getByText('Shahriar Ahmed', { exact: true })).toBeVisible();
    await expect(card.getByRole('link', { name: /www\.shahriarahmed\.net/ })).toHaveAttribute('href', 'https://www.shahriarahmed.net');
    const photo = card.getByRole('img', { name: 'Shahriar Ahmed' });
    await expect(photo).toBeVisible();
    expect(await photo.evaluate((i) => (i as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await page.close();
  }
  // Every credits line names the developer and links the website.
  const page = await ext.context.newPage();
  await page.goto(`chrome-extension://${ext.extId}/studio.html#/`);
  await expect(page.getByRole('link', { name: 'Shahriar Ahmed' }).first()).toHaveAttribute('href', 'https://www.shahriarahmed.net');
  await page.close();
});
