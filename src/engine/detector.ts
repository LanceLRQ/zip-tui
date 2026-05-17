import type { FormatId } from './types.js';

const EXT_MAP: Array<[RegExp, FormatId]> = [
  [/\.tar\.gz$/i, 'tar.gz'],
  [/\.tgz$/i, 'tar.gz'],
  [/\.tar\.bz2$/i, 'tar.bz2'],
  [/\.tbz2?$/i, 'tar.bz2'],
  [/\.tar\.xz$/i, 'tar.xz'],
  [/\.txz$/i, 'tar.xz'],
  [/\.tar\.zst$/i, 'tar.zst'],
  [/\.tar$/i, 'tar'],
  [/\.zip$/i, 'zip'],
  [/\.7z$/i, '7z'],
  [/\.gz$/i, 'gz'],
  [/\.bz2$/i, 'bz2'],
];

export function detectFormatFromExtension(filename: string): FormatId | null {
  for (const [re, id] of EXT_MAP) {
    if (re.test(filename)) return id;
  }
  return null;
}

export function detectFormatFromMagic(head: Buffer): FormatId | null {
  if (head.length >= 4 && head[0] === 0x50 && head[1] === 0x4b) return 'zip';
  if (
    head.length >= 6 &&
    head[0] === 0x37 &&
    head[1] === 0x7a &&
    head[2] === 0xbc &&
    head[3] === 0xaf &&
    head[4] === 0x27 &&
    head[5] === 0x1c
  )
    return '7z';
  if (head.length >= 2 && head[0] === 0x1f && head[1] === 0x8b) return 'gz';
  if (head.length >= 3 && head[0] === 0x42 && head[1] === 0x5a && head[2] === 0x68) return 'bz2';
  if (head.length >= 6 && head[0] === 0xfd && head[1] === 0x37 && head[2] === 0x7a) return 'tar.xz';
  return null;
}
