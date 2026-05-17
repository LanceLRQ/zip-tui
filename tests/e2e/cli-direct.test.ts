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
});
