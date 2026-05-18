import type { FormatAdapter } from '../types.js';
import { parseTarVerboseListing } from './tarUtils.js';

export const tarxzAdapter: FormatAdapter = {
  id: 'tar.xz',
  requiredTools: ['tar', 'xz'],
  supportsPassword: false,
  supportsFilenameEncryption: false,

  buildCreate(opts) {
    const args: string[] = [];
    if (opts.level !== undefined) {
      args.push('-cf', opts.archive, `--use-compress-program=xz -${opts.level}`);
    } else {
      args.push('-cJf', opts.archive);
    }
    for (const ex of opts.excludes ?? []) args.push(`--exclude=${ex}`);
    args.push(...opts.inputs);
    return { cmd: 'tar', args };
  },

  buildExtract(opts) {
    const args = ['-xJf', opts.archive, '-C', opts.outputDir];
    if (opts.files && opts.files.length > 0) args.push(...opts.files);
    return { cmd: 'tar', args };
  },

  buildList(archive) {
    return { cmd: 'tar', args: ['-tJvf', archive] };
  },

  buildTest(archive) {
    return { cmd: 'xz', args: ['-t', archive] };
  },

  parseList: parseTarVerboseListing,
};
