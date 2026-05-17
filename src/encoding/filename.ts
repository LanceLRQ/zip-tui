import iconv from 'iconv-lite';

const CJK_REPLACEMENT = /�/;

export function looksLikeMojibake(s: string): boolean {
  if (CJK_REPLACEMENT.test(s)) return true;
  let nonAscii = 0;
  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0;
    if (code > 127 && code < 256) nonAscii += 1;
  }
  return nonAscii > 0 && nonAscii / s.length > 0.3;
}

export interface DecodeResult {
  encoding: string;
  decoded: string;
}

export function decodeFromCandidates(buf: Buffer, candidates: string[]): DecodeResult {
  for (const enc of candidates) {
    try {
      const decoded = iconv.decode(buf, enc);
      if (!CJK_REPLACEMENT.test(decoded)) {
        return { encoding: enc, decoded };
      }
    } catch {
      // ignore
    }
  }
  return { encoding: 'utf8', decoded: buf.toString('utf8') };
}
