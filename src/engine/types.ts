export type FormatId =
  | 'zip'
  | '7z'
  | 'tar'
  | 'tar.gz'
  | 'tar.bz2'
  | 'tar.xz'
  | 'tar.zst'
  | 'gz'
  | 'bz2';

export const MVP_ARCHIVE_EXTENSIONS = [
  '.zip',
  '.7z',
  '.tar.gz',
  '.tgz',
  '.tar.bz2',
  '.tbz',
  '.tbz2',
  '.tar.xz',
  '.txz',
  '.tar.zst',
  '.tzst',
  '.tar',
  '.gz',
  '.bz2',
] as const;

export const FORMAT_EXTENSIONS: Record<FormatId, readonly string[]> = {
  zip: ['.zip'],
  '7z': ['.7z'],
  tar: ['.tar'],
  'tar.gz': ['.tar.gz', '.tgz'],
  'tar.bz2': ['.tar.bz2', '.tbz', '.tbz2'],
  'tar.xz': ['.tar.xz', '.txz'],
  'tar.zst': ['.tar.zst', '.tzst'],
  gz: ['.gz'],
  bz2: ['.bz2'],
};

export function defaultArchiveName(format: FormatId): string {
  const ext = FORMAT_EXTENSIONS[format][0] ?? '';
  return `archive${ext}`;
}

export interface CreateOpts {
  archive: string;
  inputs: string[];
  level?: number;
  excludes?: string[];
  password?: string | undefined;
  filenameEncryption?: boolean;
}

export interface ExtractOpts {
  archive: string;
  outputDir: string;
  password?: string | undefined;
  files?: string[];
  encoding?: string;
}

export interface BuiltCommand {
  cmd: string;
  args: string[];
  outputFile?: string;
}

export interface ArchiveEntry {
  path: string;
  size: number;
  /** Parsed modification time; absent when the tool's format is not readable. */
  modified?: Date | undefined;
  /**
   * The timestamp exactly as the tool printed it.
   *
   * BSD tar's output is lossy — recent files show a time but no year, older
   * ones a year but no time — and its month names follow the locale. Such
   * listings cannot become a reliable `Date`, so the raw text is kept and
   * shown verbatim rather than guessed at.
   */
  modifiedText?: string | undefined;
  isDir: boolean;
}

export interface Progress {
  current: number;
  total: number;
  bytesDone?: number;
}

export interface FormatAdapter {
  id: FormatId;
  requiredTools: string[];
  supportsPassword: boolean;
  supportsFilenameEncryption: boolean;
  buildCreate(opts: CreateOpts): BuiltCommand;
  buildExtract(opts: ExtractOpts): BuiltCommand;
  buildList(archive: string, password?: string): BuiltCommand;
  buildTest(archive: string, password?: string): BuiltCommand | null;
  parseList(stdout: string): ArchiveEntry[];
  parseProgress?(line: string): Progress | null;
}
