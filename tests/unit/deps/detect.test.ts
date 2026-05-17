import { describe, expect, it } from 'vitest';
import { detectTool, KNOWN_TOOLS } from '../../../src/deps/detect';

describe('detectTool', () => {
  it('returns available=true and version for installed tool', async () => {
    const r = await detectTool('bash', { versionFlag: '--version' });
    expect(r.available).toBe(true);
    expect(r.version).toMatch(/^\d+|GNU|bash/);
  });

  it('returns available=false for nonexistent tool', async () => {
    const r = await detectTool('does-not-exist-xyz', { versionFlag: '--version' });
    expect(r.available).toBe(false);
  });

  it('lists the expected MVP tools', () => {
    expect(KNOWN_TOOLS).toContain('zip');
    expect(KNOWN_TOOLS).toContain('unzip');
    expect(KNOWN_TOOLS).toContain('7z');
    expect(KNOWN_TOOLS).toContain('tar');
    expect(KNOWN_TOOLS).toContain('gzip');
  });
});
