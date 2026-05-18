import type { FormatAdapter } from '../types.js';
import { parseTarVerboseListing } from './tarUtils.js';

export const tarzstAdapter: FormatAdapter = {
  id: 'tar.zst',
  requiredTools: ['tar', 'zstd'],
  supportsPassword: false,
  supportsFilenameEncryption: false,

  buildCreate(opts) {
    const args: string[] = [];
    if (opts.level !== undefined) {
      args.push('-cf', opts.archive, `--use-compress-program=zstd -${opts.level}`);
    } else {
      args.push('--zstd', '-cf', opts.archive);
    }
    for (const ex of opts.excludes ?? []) args.push(`--exclude=${ex}`);
    args.push(...opts.inputs);
    return { cmd: 'tar', args };
  },

  buildExtract(opts) {
    const args = ['--zstd', '-xf', opts.archive, '-C', opts.outputDir];
    if (opts.files && opts.files.length > 0) args.push(...opts.files);
    return { cmd: 'tar', args };
  },

  buildList(archive) {
    return { cmd: 'tar', args: ['--zstd', '-tvf', archive] };
  },

  buildTest(archive) {
    return { cmd: 'zstd', args: ['-t', archive] };
  },

  parseList: parseTarVerboseListing,
};
