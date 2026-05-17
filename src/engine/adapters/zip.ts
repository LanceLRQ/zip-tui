import type { ArchiveEntry, FormatAdapter, Progress } from '../types.js';

function parseListLine(line: string): ArchiveEntry | null {
  const m = line.match(/^\s*(\d+)\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s+(.+)$/);
  if (!m) return null;
  const size = Number.parseInt(m[1] ?? '0', 10);
  const filePath = (m[2] ?? '').trim();
  return { path: filePath, size, isDir: filePath.endsWith('/') };
}

export const zipAdapter: FormatAdapter = {
  id: 'zip',
  requiredTools: ['zip', 'unzip'],
  supportsPassword: true,
  supportsFilenameEncryption: false,

  buildCreate(opts) {
    const args: string[] = ['-r'];
    if (opts.level !== undefined) args.push(`-${opts.level}`);
    if (opts.password) {
      args.push('-e', '-P', opts.password);
    }
    args.push(opts.archive, ...opts.inputs);
    for (const ex of opts.excludes ?? []) {
      args.push('-x', ex);
    }
    return { cmd: 'zip', args };
  },

  buildExtract(opts) {
    const args = ['-o'];
    if (opts.password) args.push('-P', opts.password);
    args.push(opts.archive, '-d', opts.outputDir);
    if (opts.files && opts.files.length > 0) args.push(...opts.files);
    return { cmd: 'unzip', args };
  },

  buildList(archive) {
    return { cmd: 'unzip', args: ['-l', archive] };
  },

  buildTest(archive, password) {
    const args = ['-t'];
    if (password) args.push('-P', password);
    args.push(archive);
    return { cmd: 'unzip', args };
  },

  parseList(stdout) {
    const out: ArchiveEntry[] = [];
    for (const line of stdout.split('\n')) {
      const entry = parseListLine(line);
      if (entry) out.push(entry);
    }
    return out;
  },

  parseProgress(line): Progress | null {
    if (/^\s*adding:/.test(line) || /^\s*deflating:/.test(line) || /^\s*storing:/.test(line)) {
      return { current: 1, total: 0 };
    }
    return null;
  },
};
