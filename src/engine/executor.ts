import { execa } from 'execa';
import { getLogger, redactPassword } from '../infra/logger.js';
import type { BuiltCommand } from './types.js';

export function renderDryRun(c: BuiltCommand): string {
  const shellQuote = (s: string) => (/[\s'"$`\\]/.test(s) ? `'${s.replace(/'/g, "'\\''")}'` : s);
  return [c.cmd, ...c.args.map(shellQuote)].join(' ');
}

export interface RunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export async function runCommand(c: BuiltCommand): Promise<RunResult> {
  const logger = getLogger();
  logger.info({ cmd: c.cmd, args: redactPassword(c.args) }, 'executor.start');
  const started = Date.now();
  try {
    const stdoutOpt = c.outputFile ? { file: c.outputFile } : 'pipe';
    const proc = execa(c.cmd, c.args, { reject: false, stdout: stdoutOpt });
    const r = await proc;
    const durationMs = Date.now() - started;
    logger.info({ cmd: c.cmd, exitCode: r.exitCode ?? -1, durationMs }, 'executor.complete');
    return { exitCode: r.exitCode ?? -1, stdout: r.stdout, stderr: r.stderr };
  } catch (err) {
    logger.error({ err: String(err) }, 'executor.fail');
    throw err;
  }
}

export interface StreamEvent {
  type: 'stdout' | 'stderr' | 'exit';
  data?: string;
  exitCode?: number;
}

export interface StreamHandle {
  events: AsyncIterable<StreamEvent>;
  cancel(): Promise<void>;
}

export function streamCommand(c: BuiltCommand): StreamHandle {
  const stdoutOpt = c.outputFile ? { file: c.outputFile } : 'pipe';
  const proc = execa(c.cmd, c.args, { reject: false, stdout: stdoutOpt, stderr: 'pipe' });
  const queue: StreamEvent[] = [];
  const waiters: Array<(e: StreamEvent | null) => void> = [];

  const push = (e: StreamEvent) => {
    const w = waiters.shift();
    if (w) w(e);
    else queue.push(e);
  };

  proc.stdout?.on('data', (chunk: Buffer) => push({ type: 'stdout', data: chunk.toString() }));
  proc.stderr?.on('data', (chunk: Buffer) => push({ type: 'stderr', data: chunk.toString() }));
  proc.then(
    (r) => push({ type: 'exit', exitCode: r.exitCode ?? -1 }),
    () => push({ type: 'exit', exitCode: -1 }),
  );

  const events: AsyncIterable<StreamEvent> = {
    async *[Symbol.asyncIterator]() {
      while (true) {
        let next: StreamEvent | null;
        const head = queue.shift();
        if (head !== undefined) next = head;
        else next = await new Promise<StreamEvent | null>((resolve) => waiters.push(resolve));
        if (!next) return;
        yield next;
        if (next.type === 'exit') return;
      }
    },
  };

  return {
    events,
    async cancel() {
      proc.kill('SIGTERM');
      await new Promise((r) => setTimeout(r, 5000));
      if (!proc.killed) proc.kill('SIGKILL');
    },
  };
}
