import { describe, expect, it } from 'vitest';
import { renderDryRun, runCommand, streamCommand } from '../../../src/engine/executor';

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
