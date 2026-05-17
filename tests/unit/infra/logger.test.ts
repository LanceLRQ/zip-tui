import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getLogger, redactPassword } from '../../../src/infra/logger';

describe('redactPassword', () => {
  it('redacts -pXXX inline form', () => {
    expect(redactPassword(['-pSecret123', '-mhe=on'])).toEqual(['-p***', '-mhe=on']);
  });

  it('redacts -p VAL when separated', () => {
    expect(redactPassword(['-p', 'Secret123'])).toEqual(['-p', '***']);
  });

  it('redacts --password=VAL', () => {
    expect(redactPassword(['--password=Secret123'])).toEqual(['--password=***']);
  });

  it('leaves non-password args untouched', () => {
    expect(redactPassword(['-r', '-9', 'out.zip'])).toEqual(['-r', '-9', 'out.zip']);
  });
});

describe('getLogger', () => {
  const originalCacheHome = process.env.XDG_CACHE_HOME;
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zt-logger-'));
    process.env.XDG_CACHE_HOME = tmp;
  });

  afterEach(() => {
    if (originalCacheHome === undefined) delete process.env.XDG_CACHE_HOME;
    else process.env.XDG_CACHE_HOME = originalCacheHome;
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('creates log directory and returns a pino logger', () => {
    const logger = getLogger();
    expect(typeof logger.info).toBe('function');
    expect(fs.existsSync(path.join(tmp, 'zip-tui', 'logs'))).toBe(true);
  });
});
