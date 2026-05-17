import { describe, expect, it } from 'vitest';
import { resolveFromProcess, resolvePaths } from '../../../src/infra/fs';

describe('resolvePaths', () => {
  it('honors XDG_CONFIG_HOME', () => {
    const p = resolvePaths({ home: '/home/u', envVars: { XDG_CONFIG_HOME: '/custom/cfg' } });
    expect(p.configDir).toBe('/custom/cfg/zip-tui');
    expect(p.configFile).toBe('/custom/cfg/zip-tui/config.json');
  });

  it('falls back to ~/.config when XDG_CONFIG_HOME not set', () => {
    const p = resolvePaths({ home: '/home/u', envVars: {} });
    expect(p.configDir).toBe('/home/u/.config/zip-tui');
    expect(p.cacheDir).toBe('/home/u/.cache/zip-tui');
    expect(p.logDir).toBe('/home/u/.cache/zip-tui/logs');
  });

  it('resolveFromProcess returns absolute paths under zip-tui project', () => {
    const p = resolveFromProcess();
    expect(p.configDir).toMatch(/zip-tui$/);
    expect(p.configFile).toMatch(/zip-tui\/config\.json$/);
    expect(p.logDir).toMatch(/zip-tui\/logs$/);
  });
});
