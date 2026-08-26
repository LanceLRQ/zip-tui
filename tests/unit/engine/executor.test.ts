import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { renderDryRun, runCommand, streamCommand } from '../../../src/engine/executor';

// every possible byte value, including the ones that are not valid UTF-8 —
// a decoding round-trip turns those into U+FFFD and inflates the file
const ALL_BYTES = Buffer.from(Array.from({ length: 256 }, (_, i) => i));

describe('renderDryRun', () => {
  it('quotes args with spaces', () => {
    const out = renderDryRun({
      cmd: 'zip',
      args: ['-r', '-9', 'my out.zip', 'src/dir name'],
    });
    expect(out).toBe(`zip -r -9 'my out.zip' 'src/dir name'`);
  });

  it('does not quote plain args', () => {
    expect(renderDryRun({ cmd: 'tar', args: ['-czf', 'out.tar.gz', 'src'] })).toBe(
      'tar -czf out.tar.gz src',
    );
  });
});

describe('runCommand', () => {
  it('runs echo and captures stdout', async () => {
    const r = await runCommand({ cmd: 'echo', args: ['hello'] });
    expect(r.exitCode).toBe(0);
    expect(r.stdout.trim()).toBe('hello');
  });

  it('returns nonzero exit for false', async () => {
    const r = await runCommand({ cmd: 'false', args: [] });
    expect(r.exitCode).not.toBe(0);
  });
});

describe('outputFile redirection', () => {
  let tmp: string;
  let src: string;

  beforeAll(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zt-bin-'));
    src = path.join(tmp, 'source.bin');
    fs.writeFileSync(src, ALL_BYTES);
  });

  afterAll(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('runCommand writes binary stdout byte-for-byte', async () => {
    const dst = path.join(tmp, 'run.bin');
    const r = await runCommand({ cmd: 'cat', args: [src], outputFile: dst });
    expect(r.exitCode).toBe(0);
    expect(fs.readFileSync(dst).equals(ALL_BYTES)).toBe(true);
  });

  it('streamCommand writes binary stdout byte-for-byte', async () => {
    const dst = path.join(tmp, 'stream.bin');
    const handle = streamCommand({ cmd: 'cat', args: [src], outputFile: dst });
    let exitCode = -2;
    for await (const ev of handle.events) {
      if (ev.type === 'exit') exitCode = ev.exitCode ?? -1;
    }
    expect(exitCode).toBe(0);
    expect(fs.readFileSync(dst).equals(ALL_BYTES)).toBe(true);
  });

  it('still reports a non-zero exit when redirecting', async () => {
    const dst = path.join(tmp, 'fail.bin');
    const r = await runCommand({
      cmd: 'cat',
      args: [path.join(tmp, 'does-not-exist')],
      outputFile: dst,
    });
    expect(r.exitCode).not.toBe(0);
    expect(r.stderr).not.toBe('');
  });
});

describe('streamCommand', () => {
  it('emits stdout and exit events', async () => {
    const handle = streamCommand({ cmd: 'echo', args: ['streamed'] });
    const types: string[] = [];
    let captured = '';
    let exitCode = -2;
    for await (const ev of handle.events) {
      types.push(ev.type);
      if (ev.type === 'stdout') captured += ev.data ?? '';
      if (ev.type === 'exit') exitCode = ev.exitCode ?? -1;
    }
    expect(types).toContain('stdout');
    expect(types[types.length - 1]).toBe('exit');
    expect(captured.trim()).toBe('streamed');
    expect(exitCode).toBe(0);
  });

  it('cancel terminates the running process', async () => {
    const handle = streamCommand({ cmd: 'sleep', args: ['5'] });
    setTimeout(() => {
      void handle.cancel();
    }, 100);
    let exitCode = -2;
    for await (const ev of handle.events) {
      if (ev.type === 'exit') exitCode = ev.exitCode ?? -1;
    }
    expect(exitCode).not.toBe(0);
  });
});
