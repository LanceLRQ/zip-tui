import type { FormatAdapter } from '../types.js';
import { parseTarVerboseListing } from './tarUtils.js';

export const tarbz2Adapter: FormatAdapter = {
  id: 'tar.bz2',
  requiredTools: ['tar', 'bzip2'],
  supportsPassword: false,
  supportsFilenameEncryption: false,

  buildCreate(opts) {
    const args: string[] = [];
    if (opts.level !== undefined) {
      args.push('-cf', opts.archive, `--use-compress-program=bzip2 -${opts.level}`);
    } else {
      args.push('-cjf', opts.archive);
    }
    for (const ex of opts.excludes ?? []) args.push(`--exclude=${ex}`);
    args.push(...opts.inputs);
    return { cmd: 'tar', args };
  },

  buildExtract(opts) {
    const args = ['-xjf', opts.archive, '-C', opts.outputDir];
    if (opts.files && opts.files.length > 0) args.push(...opts.files);
    return { cmd: 'tar', args };
  },

  buildList(archive) {
    return { cmd: 'tar', args: ['-tjvf', archive] };
  },

  buildTest(archive) {
    return { cmd: 'bzip2', args: ['-t', archive] };
  },

  parseList: parseTarVerboseListing,
};
