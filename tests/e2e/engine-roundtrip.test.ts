import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import which from 'which';
import { buildDefaultRegistry } from '../../src/engine/builder';
import { runCommand } from '../../src/engine/executor';
import type { FormatId } from '../../src/engine/types';

/**
 * Every format is exercised against the real tool, and the listing is run
 * through `parseList` rather than string-matched. Hand-written fixtures cannot
 * catch date-format or locale differences in the tools' actual output; this can.
 */
interface Case {
  id: FormatId;
  ext: string;
  tools: string[];
  /** gz / bz2 compress a single file rather than packing a tree */
  single?: boolean;
}

const CASES: Case[] = [
  { id: 'zip', ext: 'zip', tools: ['zip', 'unzip'] },
  { id: '7z', ext: '7z', tools: ['7z'] },
  { id: 'tar', ext: 'tar', tools: ['tar'] },
  { id: 'tar.gz', ext: 'tar.gz', tools: ['tar', 'gzip'] },
  { id: 'tar.bz2', ext: 'tar.bz2', tools: ['tar', 'bzip2'] },
  { id: 'tar.xz', ext: 'tar.xz', tools: ['tar', 'xz'] },
  { id: 'tar.zst', ext: 'tar.zst', tools: ['tar', 'zstd'] },
  { id: 'gz', ext: 'gz', tools: ['gzip'], single: true },
  { id: 'bz2', ext: 'bz2', tools: ['bzip2'], single: true },
];

describe.each(CASES)('roundtrip $id', ({ id, ext, tools, single }) => {
  let available = true;
  let tmp: string;

  beforeAll(async () => {
    for (const t of tools) {
      try {
        await which(t);
      } catch {
        available = false;
      }
    }
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zt-e2e-'));
    fs.mkdirSync(path.join(tmp, 'payload'));
    fs.writeFileSync(path.join(tmp, 'payload', 'hello.txt'), 'world\n');
    // a non-UTF-8-safe blob, so a decoding regression shows up as a broken archive
    fs.writeFileSync(
      path.join(tmp, 'payload', 'blob.bin'),
      Buffer.from(Array.from({ length: 256 }, (_, i) => i)),
    );
  });

  it('creates, lists, parses, and extracts', async () => {
    if (!available) return;
    const adapter = buildDefaultRegistry().get(id);
    const archive = path.join(tmp, `out.${ext}`);
    const inputs = single ? [path.join(tmp, 'payload', 'hello.txt')] : [path.join(tmp, 'payload')];

    const createOut = await runCommand(adapter.buildCreate({ archive, inputs }));
    expect(createOut.exitCode).toBe(0);
    expect(fs.existsSync(archive)).toBe(true);

    const listOut = await runCommand(adapter.buildList(archive));
    expect(listOut.exitCode).toBe(0);

    // the real point: the adapter must understand what the tool actually printed
    const entries = adapter.parseList(listOut.stdout);
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every((e) => e.path.trim() !== '')).toBe(true);
    if (!single) {
      expect(entries.some((e) => e.path.includes('hello.txt'))).toBe(true);
      expect(entries.some((e) => e.path.includes('blob.bin'))).toBe(true);
    }

    const extractDir = path.join(tmp, `extract-${ext}`);
    fs.mkdirSync(extractDir, { recursive: true });
    const xOut = await runCommand(adapter.buildExtract({ archive, outputDir: extractDir }));
    expect(xOut.exitCode).toBe(0);
  }, 60_000);
});
