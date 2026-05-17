import fs from 'node:fs';
import path from 'node:path';
import pino, { type Logger } from 'pino';
import { resolveFromProcess } from './fs.js';

export function redactPassword(args: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i] ?? '';
    if (a.startsWith('-p') && a.length > 2) {
      out.push('-p***');
    } else if (a.startsWith('--password=')) {
      out.push('--password=***');
    } else if (a === '-p' || a === '--password') {
      out.push(a);
      i += 1;
      if (i < args.length) out.push('***');
    } else {
      out.push(a);
    }
  }
  return out;
}

let cached: Logger | null = null;

export function getLogger(): Logger {
  if (cached) return cached;
  const paths = resolveFromProcess();
  fs.mkdirSync(paths.logDir, { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  const file = path.join(paths.logDir, `${today}.log`);
  cached = pino(
    { level: process.env.ZT_LOG_LEVEL ?? 'info', base: { app: 'zip-tui' } },
    pino.destination({ dest: file, sync: false }),
  );
  return cached;
}
