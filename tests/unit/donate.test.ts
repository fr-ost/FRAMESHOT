import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { WALLETS } from '../../src/core/donate';

const ROOT = path.resolve(__dirname, '../..');

describe('donation addresses', () => {
  it('are well-formed for their networks', () => {
    const byId = Object.fromEntries(WALLETS.map((w) => [w.id, w.address]));
    expect(byId.evm).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(byId.sol).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
    expect(byId.btc).toMatch(/^bc1q[02-9ac-hj-np-z]{38,58}$/);
  });

  it('match the QR generator script, and every QR and logo file exists', () => {
    const script = fs.readFileSync(path.join(ROOT, 'scripts/build-donate-qr.py'), 'utf8');
    for (const w of WALLETS) {
      expect(script).toContain(`"${w.id}": "${w.address}"`);
      for (const file of [w.qr, ...w.tokens.map((t) => t.src)]) expect(fs.existsSync(path.join(ROOT, 'public', file)), file).toBe(true);
    }
  });
});
