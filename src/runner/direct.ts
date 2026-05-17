import { detectFormatFromExtension } from '../engine/detector.js';
import { renderDryRun, runCommand, streamCommand } from '../engine/executor.js';
import type { FormatRegistry } from '../engine/registry.js';
import type { BuiltCommand, CreateOpts, ExtractOpts } from '../engine/types.js';

export function resolveCreateCommand(registry: FormatRegistry, opts: CreateOpts): BuiltCommand {
  const fmt = detectFormatFromExtension(opts.archive);
  if (!fmt) throw new Error(`cannot detect format from archive: ${opts.archive}`);
  const adapter = registry.get(fmt);
  return adapter.buildCreate(opts);
}

export function resolveExtractCommand(registry: FormatRegistry, opts: ExtractOpts): BuiltCommand {
  const fmt = detectFormatFromExtension(opts.archive);
  if (!fmt) throw new Error(`cannot detect format from archive: ${opts.archive}`);
  return registry.get(fmt).buildExtract(opts);
}

export function resolveListCommand(
  registry: FormatRegistry,
  archive: string,
  password?: string,
): BuiltCommand {
  const fmt = detectFormatFromExtension(archive);
  if (!fmt) throw new Error(`cannot detect format from archive: ${archive}`);
  return registry.get(fmt).buildList(archive, password);
}

export interface DirectRunOptions {
  dryRun: boolean;
  stream?: boolean;
}

export async function executeDirect(cmd: BuiltCommand, opts: DirectRunOptions): Promise<number> {
  if (opts.dryRun) {
    process.stdout.write(`${renderDryRun(cmd)}\n`);
    return 0;
  }
  if (opts.stream) {
    const handle = streamCommand(cmd);
    for await (const ev of handle.events) {
      if (ev.type === 'stdout') process.stdout.write(ev.data ?? '');
      if (ev.type === 'stderr') process.stderr.write(ev.data ?? '');
      if (ev.type === 'exit') return ev.exitCode ?? -1;
    }
    return -1;
  }
  const r = await runCommand(cmd);
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  return r.exitCode;
}
