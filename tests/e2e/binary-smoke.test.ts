import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execa } from 'execa';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import which from 'which';

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

/**
 * These run the *compiled Bun binary*, not the Vitest (Node) process. Stream
 * encoding differs between the two runtimes, so a formats-with-binary-stdout
 * regression is only observable here.
 */
describe('compiled binary produces intact archives', () => {
  let tmp: string;
  let src: string;
  let haveGzip = true;
  let haveBzip2 = true;

  beforeAll(async () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zt-bin-e2e-'));
    src = path.join(tmp, 'payload.txt');
    // long enough that a corrupted stream cannot coincidentally still inflate
    fs.writeFileSync(src, 'the quick brown fox jumps over the lazy dog\n'.repeat(50));
    for (const [tool, set] of [
      ['gzip', (v: boolean) => (haveGzip = v)],
      ['bzip2', (v: boolean) => (haveBzip2 = v)],
    ] as const) {
      try {
        await which(tool);
      } catch {
        set(false);
      }
    }
  }, 120_000);

  afterAll(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('creates a gz archive the system gzip accepts', async () => {
    if (!haveGzip) return;
    const archive = path.join(tmp, 'out.gz');
    const r = await execa(BIN, ['a', archive, src], {
      reject: false,
      env: { ...process.env, ZT_NO_TUI: '1' },
    });
    expect(r.exitCode).toBe(0);
    const verify = await execa('gzip', ['-t', archive], { reject: false });
    expect(verify.exitCode).toBe(0);
    const back = await execa('gzip', ['-cd', archive], { reject: false });
    expect(back.stdout).toBe(fs.readFileSync(src, 'utf8').trimEnd());
  }, 60_000);

  it('creates a bz2 archive the system bzip2 accepts', async () => {
    if (!haveBzip2) return;
    const archive = path.join(tmp, 'out.bz2');
    const r = await execa(BIN, ['a', archive, src], {
      reject: false,
      env: { ...process.env, ZT_NO_TUI: '1' },
    });
    expect(r.exitCode).toBe(0);
    const verify = await execa('bzip2', ['-t', archive], { reject: false });
    expect(verify.exitCode).toBe(0);
  }, 60_000);
});
