import { describe, expect, it } from 'vitest';
import { createRegistry } from '../../../src/engine/registry';
import type { FormatAdapter } from '../../../src/engine/types';

const fake: FormatAdapter = {
  id: 'zip',
  requiredTools: ['zip', 'unzip'],
  supportsPassword: true,
  supportsFilenameEncryption: false,
  buildCreate: () => ({ cmd: 'zip', args: [] }),
  buildExtract: () => ({ cmd: 'unzip', args: [] }),
  buildList: () => ({ cmd: 'unzip', args: ['-l'] }),
  buildTest: () => ({ cmd: 'unzip', args: ['-t'] }),
  parseList: () => [],
};

describe('FormatRegistry', () => {
  it('registers and retrieves an adapter by id', () => {
    const r = createRegistry();
    r.register(fake);
    expect(r.get('zip')).toBe(fake);
  });

  it('throws when registering duplicate id', () => {
    const r = createRegistry();
    r.register(fake);
    expect(() => r.register(fake)).toThrow(/duplicate/i);
  });

  it('throws when getting unknown id', () => {
    const r = createRegistry();
    expect(() => r.get('zip')).toThrow(/not registered/i);
  });

  it('lists all registered ids', () => {
    const r = createRegistry();
    r.register(fake);
    expect(r.list()).toEqual(['zip']);
  });
});
