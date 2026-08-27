import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { render } from 'ink-testing-library';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { initI18n } from '../../../src/infra/i18n';
import { BrowserPage } from '../../../src/tui/pages/BrowserPage';

let dir = '';

const flush = () => new Promise((r) => setTimeout(r, 40));

beforeAll(async () => {
  await initI18n('zh');
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zt-browser-'));
  fs.mkdirSync(path.join(dir, 'sub'));
  fs.writeFileSync(path.join(dir, 'sub', 'inner.txt'), 'x');
  fs.writeFileSync(path.join(dir, 'note.txt'), 'hello');
});

afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('BrowserPage on the filesystem', () => {
  it('opens on the filesystem and lists the directory', () => {
    const { lastFrame } = render(<BrowserPage initialDir={dir} />);
    const out = lastFrame() ?? '';
    expect(out).toContain('📂');
    expect(out).toContain('sub');
    expect(out).toContain('note.txt');
  });

  it('shows the filesystem hint line', () => {
    const { lastFrame } = render(<BrowserPage initialDir={dir} />);
    expect(lastFrame() ?? '').toContain('Space');
  });

  it('shows no marked count before anything is marked', () => {
    const { lastFrame } = render(<BrowserPage initialDir={dir} />);
    // the static hint line legitimately contains 已选 ("m 已选"), so match the
    // badge shape rather than the bare word
    expect(lastFrame() ?? '').not.toMatch(/\[\d+ 已选\]/);
  });

  it('marks the row under the cursor on Space', async () => {
    const { lastFrame, stdin } = render(<BrowserPage initialDir={dir} />);
    stdin.write(' ');
    await flush();
    expect(lastFrame() ?? '').toMatch(/\[\d+ 已选\]/);
  });

  it('descends into a directory on Enter', async () => {
    const { lastFrame, stdin } = render(<BrowserPage initialDir={dir} />);
    stdin.write('\r');
    await flush();
    expect(lastFrame() ?? '').toContain('inner.txt');
  });

  // the parent row's real action is stepping out, so the hint must not say
  // "enter" over it
  it('shows the step-out hint on the parent row, not an enter hint', async () => {
    const { lastFrame, stdin } = render(<BrowserPage initialDir={path.join(dir, 'sub')} />);
    await flush();
    stdin.write('\x1b[A'); // up, onto ..
    await flush();
    expect(lastFrame() ?? '').toContain('上一级');
  });

  // opening a directory with the cursor on its parent would make the first
  // Enter step back out of where you just opened
  it('starts the cursor on the first real entry, not on the parent row', async () => {
    const { lastFrame } = render(<BrowserPage initialDir={path.join(dir, 'sub')} />);
    await flush();
    expect(lastFrame() ?? '').not.toContain('上一级');
  });

  it('opens the help panel on ? and closes it on Esc', async () => {
    const { lastFrame, stdin } = render(<BrowserPage initialDir={dir} />);
    stdin.write('?');
    await flush();
    expect(lastFrame() ?? '').toContain('快捷键');
    stdin.write('\x1b');
    await flush();
    expect(lastFrame() ?? '').not.toContain('快捷键');
  });

  it('opens the marked list on m', async () => {
    const { lastFrame, stdin } = render(<BrowserPage initialDir={dir} />);
    stdin.write(' ');
    await flush();
    stdin.write('m');
    await flush();
    expect(lastFrame() ?? '').toContain('已选 1 项');
  });

  // marking a directory makes a byte total meaningless, so it must not claim one
  it('omits the size total when a directory is marked', async () => {
    const { lastFrame, stdin } = render(<BrowserPage initialDir={dir} />);
    stdin.write(' ');
    await flush();
    stdin.write('m');
    await flush();
    const out = lastFrame() ?? '';
    expect(out).toContain('个目录');
    expect(out).not.toContain('共 0 B');
  });
});
