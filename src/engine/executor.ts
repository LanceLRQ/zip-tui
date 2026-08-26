import { type ChildProcess, spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { execa } from 'execa';
import { getLogger, redactPassword } from '../infra/logger.js';
import type { BuiltCommand } from './types.js';

/**
 * Redirects a command's stdout to a file as raw bytes.
 *
 * execa decodes stdout as UTF-8, which silently mangles binary payloads: every
 * byte that is not valid UTF-8 becomes U+FFFD, so `gzip -c` output stops being
 * a valid archive. That decoding happens inside the runtime's stream layer, so
 * it bites under Bun (what the compiled binary uses) even though Node passes
 * the bytes through. node:child_process gives us an undecoded stream on both.
 */
function spawnToFile(
  c: BuiltCommand,
  outputFile: string,
  onStderr?: (chunk: string) => void,
): { proc: ChildProcess; done: Promise<{ exitCode: number; stderr: string }> } {
  const proc = spawn(c.cmd, c.args, { stdio: ['ignore', 'pipe', 'pipe'] });
  const done = new Promise<{ exitCode: number; stderr: string }>((resolve, reject) => {
    const sink = createWriteStream(outputFile);
    let stderr = '';
    let exitCode: number | null = null;
    let sinkClosed = false;

    // both the process and the file stream must finish before the bytes on
    // disk are complete
    const settle = () => {
      if (exitCode === null || !sinkClosed) return;
      resolve({ exitCode, stderr });
    };

    proc.stdout?.pipe(sink);
    proc.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stderr += text;
      onStderr?.(text);
    });
    sink.on('close', () => {
      sinkClosed = true;
      settle();
    });
    sink.on('error', reject);
    proc.on('error', reject);
    proc.on('close', (code, signal) => {
      // a signalled kill reports code null; surface it as a failure, not success
      exitCode = code ?? (signal ? -1 : 0);
      settle();
    });
  });
  return { proc, done };
}

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
    if (c.outputFile) {
      const { exitCode, stderr } = await spawnToFile(c, c.outputFile).done;
      logger.info({ cmd: c.cmd, exitCode, durationMs: Date.now() - started }, 'executor.complete');
      // stdout went to the file, so there is nothing to hand back as text
      return { exitCode, stdout: '', stderr };
    }
    const proc = execa(c.cmd, c.args, { reject: false });
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
  const queue: StreamEvent[] = [];
  const waiters: Array<(e: StreamEvent | null) => void> = [];

  const push = (e: StreamEvent) => {
    const w = waiters.shift();
    if (w) w(e);
    else queue.push(e);
  };

  // when redirecting to a file the payload is binary; it must bypass execa's
  // UTF-8 decoding, and there are no stdout events to emit since the bytes go
  // straight to disk
  const redirect = c.outputFile
    ? spawnToFile(c, c.outputFile, (data) => push({ type: 'stderr', data }))
    : null;
  const proc = redirect
    ? redirect.proc
    : execa(c.cmd, c.args, { reject: false, stdout: 'pipe', stderr: 'pipe' });

  if (redirect) {
    redirect.done.then(
      (r) => push({ type: 'exit', exitCode: r.exitCode }),
      () => push({ type: 'exit', exitCode: -1 }),
    );
  } else {
    proc.stdout?.on('data', (chunk: Buffer) => push({ type: 'stdout', data: chunk.toString() }));
    proc.stderr?.on('data', (chunk: Buffer) => push({ type: 'stderr', data: chunk.toString() }));
    (proc as ReturnType<typeof execa>).then(
      (r) => push({ type: 'exit', exitCode: r.exitCode ?? -1 }),
      () => push({ type: 'exit', exitCode: -1 }),
    );
  }

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
