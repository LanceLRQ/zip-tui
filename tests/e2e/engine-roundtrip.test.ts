import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import which from 'which';
import { buildDefaultRegistry } from '../../src/engine/builder';
import { runCommand } from '../../src/engine/executor';

describe.each([
  { id: 'zip' as const, tools: ['zip', 'unzip'] },
  { id: '7z' as const, tools: ['7z'] },
  { id: 'tar.gz' as const, tools: ['tar', 'gzip'] },
])('roundtrip $id', ({ id, tools }) => {
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
    fs.writeFileSync(path.join(tmp, 'hello.txt'), 'world');
  });

  it('creates, lists, and extracts', async () => {
    if (!available) return;
    const r = buildDefaultRegistry();
    const adapter = r.get(id);
    const archive = path.join(tmp, `out.${id === 'tar.gz' ? 'tar.gz' : id}`);
    const createOut = await runCommand(
      adapter.buildCreate({
        archive,
        inputs: [path.join(tmp, 'hello.txt')],
      }),
    );
    expect(createOut.exitCode).toBe(0);
    expect(fs.existsSync(archive)).toBe(true);

    const listOut = await runCommand(adapter.buildList(archive));
    expect(listOut.exitCode).toBe(0);
    expect(listOut.stdout).toContain('hello.txt');

    const extractDir = path.join(tmp, `extract-${id}`);
    fs.mkdirSync(extractDir, { recursive: true });
    const xOut = await runCommand(
      adapter.buildExtract({
        archive,
        outputDir: extractDir,
      }),
    );
    expect(xOut.exitCode).toBe(0);
  }, 30_000);
});
