import iconv from 'iconv-lite';
import { describe, expect, it } from 'vitest';
import { decodeFromCandidates, looksLikeMojibake } from '../../../src/encoding/filename';

describe('looksLikeMojibake', () => {
  it('returns true on garbled string', () => {
    const garbled = Buffer.from('中文').toString('binary');
    expect(looksLikeMojibake(garbled)).toBe(true);
  });

  it('returns false on plain ascii', () => {
    expect(looksLikeMojibake('hello-world.txt')).toBe(false);
  });
});

describe('decodeFromCandidates', () => {
  it('decodes GBK bytes correctly', () => {
    const original = '中文文件.txt';
    const gbkBytes = iconv.encode(original, 'gbk');
    const result = decodeFromCandidates(gbkBytes, ['gbk', 'shift_jis', 'cp437']);
    expect(result.encoding).toBe('gbk');
    expect(result.decoded).toBe(original);
  });
});
