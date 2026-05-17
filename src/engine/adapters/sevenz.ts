import type { ArchiveEntry, FormatAdapter, Progress } from '../types.js';

export const sevenzAdapter: FormatAdapter = {
  id: '7z',
  requiredTools: ['7z'],
  supportsPassword: true,
  supportsFilenameEncryption: true,

  buildCreate(opts) {
    const args: string[] = ['a', '-t7z'];
    if (opts.level !== undefined) args.push(`-mx=${opts.level}`);
    if (opts.password) {
      args.push(`-p${opts.password}`);
      if (opts.filenameEncryption) args.push('-mhe=on');
    }
    args.push(opts.archive, ...opts.inputs);
    for (const ex of opts.excludes ?? []) {
      args.push(`-xr!${ex}`);
    }
    return { cmd: '7z', args };
  },

  buildExtract(opts) {
    const args = ['x', opts.archive, `-o${opts.outputDir}`, '-y'];
    if (opts.password) args.push(`-p${opts.password}`);
    if (opts.files && opts.files.length > 0) args.push(...opts.files);
    return { cmd: '7z', args };
  },

  buildList(archive, password) {
    const args = ['l', archive];
    if (password) args.push(`-p${password}`);
    return { cmd: '7z', args };
  },

  buildTest(archive, password) {
    const args = ['t', archive];
    if (password) args.push(`-p${password}`);
    return { cmd: '7z', args };
  },

  parseList(stdout) {
    const out: ArchiveEntry[] = [];
    const lines = stdout.split('\n');
    let inTable = false;
    for (const line of lines) {
      if (/^-{3,}/.test(line)) {
        inTable = !inTable;
        continue;
      }
      if (!inTable) continue;
      const m = line.match(/^(\S+\s+\S+)\s+(\S+)\s+(\d+)\s+(\d+|\s+)\s+(.+)$/);
      if (!m) continue;
      const attr = m[2] ?? '';
      const size = Number.parseInt(m[3] ?? '0', 10);
      const filePath = (m[5] ?? '').trim();
      out.push({ path: filePath, size, isDir: attr.includes('D') });
    }
    return out;
  },

  parseProgress(line): Progress | null {
    const m = line.match(/^\s*(\d{1,3})%/);
    if (!m) return null;
    return { current: Number.parseInt(m[1] ?? '0', 10), total: 100 };
  },
};
