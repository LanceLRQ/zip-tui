import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { listDirectoryAsNodes } from '../../../src/tui/components/useDirectoryTree';

describe('listDirectoryAsNodes', () => {
  it('lists files and dirs with depth', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zt-dl-'));
    fs.writeFileSync(path.join(tmp, 'a.txt'), 'hi');
    fs.mkdirSync(path.join(tmp, 'sub'));
    fs.writeFileSync(path.join(tmp, 'sub', 'b.txt'), 'hi');

    const nodes = listDirectoryAsNodes(tmp, { depth: 0, showHidden: false });
    expect(nodes.some((n) => n.label === 'a.txt' && !n.isDir)).toBe(true);
    expect(nodes.some((n) => n.label === 'sub' && n.isDir)).toBe(true);
  });

  it('filters hidden when showHidden=false', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zt-dl-'));
    fs.writeFileSync(path.join(tmp, '.hidden'), 'hi');
    fs.writeFileSync(path.join(tmp, 'visible.txt'), 'hi');

    const nodes = listDirectoryAsNodes(tmp, { depth: 0, showHidden: false });
    expect(nodes.map((n) => n.label)).toEqual(['visible.txt']);
  });

  it('includes hidden when showHidden=true', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zt-dl-'));
    fs.writeFileSync(path.join(tmp, '.hidden'), 'hi');

    const nodes = listDirectoryAsNodes(tmp, { depth: 0, showHidden: true });
    expect(nodes.some((n) => n.label === '.hidden')).toBe(true);
  });
});
