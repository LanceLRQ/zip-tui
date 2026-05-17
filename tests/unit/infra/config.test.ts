import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ConfigSchema, defaultConfig, getConfig } from '../../../src/infra/config';

describe('config schema', () => {
  it('accepts the default config', () => {
    expect(() => ConfigSchema.parse(defaultConfig)).not.toThrow();
  });

  it('rejects bad language', () => {
    const bad = { ...defaultConfig, language: 'fr' };
    expect(() => ConfigSchema.parse(bad)).toThrow();
  });

  it('rejects level > 9', () => {
    const bad = {
      ...defaultConfig,
      defaults: { ...defaultConfig.defaults, compressionLevel: 11 },
    };
    expect(() => ConfigSchema.parse(bad)).toThrow();
  });
});

describe('getConfig', () => {
  const originalConfigHome = process.env.XDG_CONFIG_HOME;
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zt-config-'));
    process.env.XDG_CONFIG_HOME = tmp;
  });

  afterEach(() => {
    if (originalConfigHome === undefined) delete process.env.XDG_CONFIG_HOME;
    else process.env.XDG_CONFIG_HOME = originalConfigHome;
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('returns a Conf instance backed by XDG config dir', () => {
    const conf = getConfig();
    expect(conf.get('language')).toBe('zh');
    expect(conf.get('defaults').format).toBe('tar.gz');
  });
});
