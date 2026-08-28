import path from 'node:path';
import { execa } from 'execa';
import { describe, expect, it } from 'vitest';

const ENTRY = path.resolve(__dirname, '../../src/index.ts');

describe('cli direct mode', () => {
  it('--dry-run prints zip command and exits 0', async () => {
    const r = await execa('bun', ['run', ENTRY, 'a', 'out.zip', 'src', '--dry-run'], {
      reject: false,
      env: { ...process.env, ZT_NO_TUI: '1' },
    });
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('zip -r out.zip src');
  });

  it('errors on missing inputs in non-interactive mode', async () => {
    const r = await execa('bun', ['run', ENTRY, 'a', 'out.zip'], {
      reject: false,
      env: { ...process.env, ZT_NO_TUI: '1' },
    });
    expect(r.exitCode).toBe(2);
    expect(r.stderr).toContain('missing');
  });

  it('errors on bare invocation in non-TTY mode', async () => {
    const r = await execa('bun', ['run', ENTRY], {
      reject: false,
      env: { ...process.env, ZT_NO_TUI: '1' },
    });
    expect(r.exitCode).toBe(2);
    expect(r.stderr).toContain('missing subcommand');
  });

  // scripts and pipes must never get a TUI, whatever the subcommand
  it('l stays non-interactive and prints the command', async () => {
    const r = await execa('bun', ['run', ENTRY, 'l', 'out.zip', '--dry-run'], {
      reject: false,
      env: { ...process.env, ZT_NO_TUI: '1' },
    });
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('unzip');
  });

  /**
   * The archive argument is declared optional so a bare subcommand reaches our
   * own handling. Declared required, commander exits 1 from inside the
   * subcommand before control returns here, which both hides the real message
   * and makes `zt a` on a terminal unable to open the browser at all.
   */
  describe.each([
    ['a', 'missing archive or input files'],
    ['x', 'missing archive'],
    ['l', 'missing archive'],
  ])('bare %s', (sub, message) => {
    it('reports what is missing and exits 2 rather than 1', async () => {
      const r = await execa('bun', ['run', ENTRY, sub], {
        reject: false,
        env: { ...process.env, ZT_NO_TUI: '1' },
      });
      expect(r.exitCode).toBe(2);
      expect(r.stderr).toContain(message);
      // commander's own wording would mean it never reached us
      expect(r.stderr).not.toContain('required argument');
    });
  });
});
