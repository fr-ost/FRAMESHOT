import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');

describe('Chrome Web Store kit', () => {
  it('keeps the name and summary identical to the manifest and within the store limits', () => {
    const config = read('wxt.config.ts');
    const name = read('store-kit/1-store-listing/name.txt');
    const summary = read('store-kit/1-store-listing/summary.txt');
    expect(config).toContain(`name: '${name}'`);
    expect(config.replace(/description:\s*\n\s*/, 'description: ')).toContain(`description: '${summary}'`);
    expect(name.length).toBeLessThanOrEqual(75);
    expect(summary.length).toBeLessThanOrEqual(132);
    expect(read('store-kit/1-store-listing/description.txt').length).toBeLessThanOrEqual(16000);
  });

  it('justifies exactly the permissions the extension requests', () => {
    const config = read('wxt.config.ts');
    const perms = config.match(/\n\s*permissions:\s*\[([^\]]*)\]/)![1].match(/'([^']+)'/g)!.map((s) => s.slice(1, -1));
    const files = fs.readdirSync(path.join(ROOT, 'store-kit/2-privacy-practices/permissions')).map((f) => f.replace(/\.txt$/, ''));
    expect(files.sort()).toEqual(perms.sort());
  });
});
