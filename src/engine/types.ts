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

export const MVP_ARCHIVE_EXTENSIONS = ['.zip', '.7z', '.tar.gz', '.tgz', '.tar'] as const;

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
}

export interface ArchiveEntry {
  path: string;
  size: number;
  modified?: Date | undefined;
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
