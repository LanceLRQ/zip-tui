import path from 'node:path';
import type { ArchiveEntry, FormatAdapter } from '../types.js';

function stripBz2Suffix(name: string): string {
  return name.replace(/\.bz2$/i, '').replace(/\.tbz2?$/i, '.tar');
}

export const bz2Adapter: FormatAdapter = {
  id: 'bz2',
  requiredTools: ['bzip2'],
  supportsPassword: false,
  supportsFilenameEncryption: false,

  buildCreate(opts) {
    if (opts.inputs.length !== 1) {
      throw new Error(`bz2 adapter expects exactly one input, got ${opts.inputs.length}`);
    }
    const args: string[] = ['-c'];
    if (opts.level !== undefined) args.push(`-${opts.level}`);
    args.push(opts.inputs[0] as string);
    return { cmd: 'bzip2', args, outputFile: opts.archive };
  },

  buildExtract(opts) {
    const outName = stripBz2Suffix(path.basename(opts.archive));
    return {
      cmd: 'bzip2',
      args: ['-cd', opts.archive],
      outputFile: path.join(opts.outputDir, outName),
    };
  },

  buildList(archive) {
    // bzip2 has no listing — return a single-entry inferred from the filename.
    return { cmd: 'echo', args: [stripBz2Suffix(path.basename(archive))] };
  },

  buildTest(archive) {
    return { cmd: 'bzip2', args: ['-t', archive] };
  },

  parseList(stdout): ArchiveEntry[] {
    const name = stdout.trim();
    if (!name) return [];
    return [{ path: name, size: 0, isDir: false }];
  },
};
