import { describe, expect, it, vi } from 'vitest';
import { buildDefaultRegistry } from '../../../src/engine/builder';
import {
  executeDirect,
  resolveCreateCommand,
  resolveExtractCommand,
  resolveListCommand,
} from '../../../src/runner/direct';

describe('resolveCreateCommand', () => {
  it('detects format from archive extension', () => {
    const r = buildDefaultRegistry();
    const cmd = resolveCreateCommand(r, {
      archive: 'out.tar.gz',
      inputs: ['src'],
      excludes: [],
    });
    expect(cmd.cmd).toBe('tar');
  });

  it('throws when format cannot be detected', () => {
    const r = buildDefaultRegistry();
    expect(() =>
      resolveCreateCommand(r, { archive: 'out.unknown', inputs: ['src'], excludes: [] }),
    ).toThrow(/cannot detect format/i);
  });

  it('passes through level and excludes', () => {
    const r = buildDefaultRegistry();
    const cmd = resolveCreateCommand(r, {
      archive: 'out.zip',
      inputs: ['src'],
      level: 9,
      excludes: ['node_modules/*'],
    });
    expect(cmd.args).toContain('-9');
    expect(cmd.args).toContain('-x');
  });
});

describe('resolveExtractCommand', () => {
  it('detects format and produces unzip command', () => {
    const r = buildDefaultRegistry();
    const cmd = resolveExtractCommand(r, { archive: 'in.zip', outputDir: '/tmp' });
    expect(cmd.cmd).toBe('unzip');
  });

  it('throws on unknown extension', () => {
    const r = buildDefaultRegistry();
    expect(() => resolveExtractCommand(r, { archive: 'in.rar', outputDir: '/tmp' })).toThrow(
      /cannot detect format/i,
    );
  });
});

describe('resolveListCommand', () => {
  it('detects format and produces list command', () => {
    const r = buildDefaultRegistry();
    const cmd = resolveListCommand(r, 'in.7z');
    expect(cmd.cmd).toBe('7z');
    expect(cmd.args[0]).toBe('l');
  });

  it('throws on unknown extension', () => {
    const r = buildDefaultRegistry();
    expect(() => resolveListCommand(r, 'in.rar')).toThrow(/cannot detect format/i);
  });
});

describe('executeDirect', () => {
  it('prints command when dryRun', async () => {
    const writes: string[] = [];
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation(((
      chunk: string | Uint8Array,
    ) => {
      writes.push(typeof chunk === 'string' ? chunk : chunk.toString());
      return true;
    }) as typeof process.stdout.write);
    const exit = await executeDirect(
      { cmd: 'tar', args: ['-czf', 'out.tar.gz', 'src'] },
      { dryRun: true },
    );
    spy.mockRestore();
    expect(exit).toBe(0);
    expect(writes.join('')).toContain('tar -czf out.tar.gz src');
  });

  it('streams stdout and exits 0 for echo', async () => {
    const spy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation((() => true) as typeof process.stdout.write);
    const exit = await executeDirect(
      { cmd: 'echo', args: ['hello'] },
      { dryRun: false, stream: true },
    );
    spy.mockRestore();
    expect(exit).toBe(0);
  });

  it('non-stream path runs and returns exit code', async () => {
    const spy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation((() => true) as typeof process.stdout.write);
    const exit = await executeDirect({ cmd: 'echo', args: ['hi'] }, { dryRun: false });
    spy.mockRestore();
    expect(exit).toBe(0);
  });
});
