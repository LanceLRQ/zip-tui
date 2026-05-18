import path from 'node:path';
import type { ArchiveEntry, FormatAdapter } from '../types.js';

function stripGzSuffix(name: string): string {
  return name.replace(/\.gz$/i, '').replace(/\.tgz$/i, '.tar');
}

export const gzAdapter: FormatAdapter = {
  id: 'gz',
  requiredTools: ['gzip'],
  supportsPassword: false,
  supportsFilenameEncryption: false,

  buildCreate(opts) {
    if (opts.inputs.length !== 1) {
      throw new Error(`gz adapter expects exactly one input, got ${opts.inputs.length}`);
    }
    const args: string[] = ['-c'];
    if (opts.level !== undefined) args.push(`-${opts.level}`);
    args.push(opts.inputs[0] as string);
    return { cmd: 'gzip', args, outputFile: opts.archive };
  },

  buildExtract(opts) {
    const outName = stripGzSuffix(path.basename(opts.archive));
    return {
      cmd: 'gzip',
      args: ['-cd', opts.archive],
      outputFile: path.join(opts.outputDir, outName),
    };
  },

  buildList(archive) {
    return { cmd: 'gzip', args: ['-l', archive] };
  },

  buildTest(archive) {
    return { cmd: 'gzip', args: ['-t', archive] };
  },

  parseList(stdout): ArchiveEntry[] {
    const lines = stdout.split('\n').filter((l) => l.trim().length > 0);
    // header line + at least one data line; gunzip -l prints columns:
    //   compressed  uncompressed  ratio  uncompressed_name
    for (const line of lines.slice(1)) {
      const m = line.match(/^\s*\d+\s+(\d+)\s+\S+\s+(.+)$/);
      if (!m) continue;
      const size = Number.parseInt(m[1] ?? '0', 10);
      const filePath = (m[2] ?? '').trim();
      return [{ path: filePath, size, isDir: false }];
    }
    return [];
  },
};
