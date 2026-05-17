import type { ArchiveEntry, FormatAdapter } from '../types.js';

export const targzAdapter: FormatAdapter = {
  id: 'tar.gz',
  requiredTools: ['tar', 'gzip'],
  supportsPassword: false,
  supportsFilenameEncryption: false,

  buildCreate(opts) {
    const args: string[] = [];
    if (opts.level !== undefined) {
      args.push('-cf', opts.archive, `--use-compress-program=gzip -${opts.level}`);
    } else {
      args.push('-czf', opts.archive);
    }
    for (const ex of opts.excludes ?? []) {
      args.push(`--exclude=${ex}`);
    }
    args.push(...opts.inputs);
    return { cmd: 'tar', args };
  },

  buildExtract(opts) {
    const args = ['-xzf', opts.archive, '-C', opts.outputDir];
    if (opts.files && opts.files.length > 0) args.push(...opts.files);
    return { cmd: 'tar', args };
  },

  buildList(archive) {
    return { cmd: 'tar', args: ['-tzvf', archive] };
  },

  buildTest(archive) {
    return { cmd: 'gzip', args: ['-t', archive] };
  },

  parseList(stdout) {
    const out: ArchiveEntry[] = [];
    for (const line of stdout.split('\n')) {
      const m = line.match(
        /^([dlrwx-]{10})\s+\S+\s+(\d+)\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s+(.+)$/,
      );
      if (!m) continue;
      const perm = m[1] ?? '';
      const size = Number.parseInt(m[2] ?? '0', 10);
      const filePath = (m[3] ?? '').trim();
      out.push({ path: filePath, size, isDir: perm.startsWith('d') });
    }
    return out;
  },
};
