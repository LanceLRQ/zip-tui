import fs from 'node:fs';
import path from 'node:path';
import { execa } from 'execa';
import { beforeAll, describe, expect, it } from 'vitest';

const BIN = path.resolve(__dirname, '../../dist/zt');

describe('compiled binary', () => {
  beforeAll(async () => {
    await execa('bun', ['run', 'build'], { cwd: path.resolve(__dirname, '../..') });
  }, 120_000);

  it('prints help', async () => {
    expect(fs.existsSync(BIN)).toBe(true);
    const r = await execa(BIN, ['--help'], { reject: false });
    expect(r.stdout + r.stderr).toMatch(/zip-tui|Usage/i);
  });

  it('runs dry-run for compress', async () => {
    const r = await execa(BIN, ['a', 'out.zip', 'src', '--dry-run'], {
      reject: false,
      env: { ...process.env, ZT_NO_TUI: '1' },
    });
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('zip');
  });
});
