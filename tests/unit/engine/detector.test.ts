import { describe, expect, it } from 'vitest';
import { detectFormatFromExtension, detectFormatFromMagic } from '../../../src/engine/detector';

describe('detectFormatFromExtension', () => {
  it.each([
    ['out.zip', 'zip'],
    ['out.7z', '7z'],
    ['out.tar.gz', 'tar.gz'],
    ['out.tgz', 'tar.gz'],
    ['out.tar.bz2', 'tar.bz2'],
    ['out.tbz2', 'tar.bz2'],
    ['out.tar.xz', 'tar.xz'],
    ['out.txz', 'tar.xz'],
    ['out.tar.zst', 'tar.zst'],
    ['out.gz', 'gz'],
    ['out.bz2', 'bz2'],
    ['out.tar', 'tar'],
  ])('detects %s as %s', (name, expected) => {
    expect(detectFormatFromExtension(name)).toBe(expected);
  });

  it('returns null for unknown extension', () => {
    expect(detectFormatFromExtension('out.rar')).toBeNull();
    expect(detectFormatFromExtension('noext')).toBeNull();
  });
});

describe('detectFormatFromMagic', () => {
  it('detects zip by PK signature', () => {
    expect(detectFormatFromMagic(Buffer.from([0x50, 0x4b, 0x03, 0x04]))).toBe('zip');
  });

  it('detects 7z by signature', () => {
    expect(detectFormatFromMagic(Buffer.from([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]))).toBe('7z');
  });

  it('detects gzip by signature', () => {
    expect(detectFormatFromMagic(Buffer.from([0x1f, 0x8b]))).toBe('gz');
  });

  it('detects bzip2 by signature', () => {
    expect(detectFormatFromMagic(Buffer.from([0x42, 0x5a, 0x68]))).toBe('bz2');
  });

  it('detects xz by signature', () => {
    expect(detectFormatFromMagic(Buffer.from([0xfd, 0x37, 0x7a, 0x58, 0x5a, 0x00]))).toBe('tar.xz');
  });

  it('returns null on unknown buffer', () => {
    expect(detectFormatFromMagic(Buffer.from([0x00, 0x01]))).toBeNull();
  });
});
