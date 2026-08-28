import { execFileSync } from 'node:child_process';
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
  // wrapped.zip holds everything under one top-level folder, so extracting it
  // must not add a second wrapper
  execFileSync('zip', ['-qr', path.join(dir, 'wrapped.zip'), 'sub'], { cwd: dir });
  // loose.zip scatters files at the top level, so it does need a folder
  fs.writeFileSync(path.join(dir, 'other.txt'), 'y');
  execFileSync('zip', ['-q', path.join(dir, 'loose.zip'), 'note.txt', 'other.txt'], { cwd: dir });
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

describe('BrowserPage compress panel', () => {
  it('opens the compress panel on `a` once something is marked', async () => {
    const { lastFrame, stdin } = render(<BrowserPage initialDir={dir} />);
    await flush();
    stdin.write(' ');
    await flush();
    stdin.write('a');
    await flush();
    const out = lastFrame() ?? '';
    expect(out).toContain('格式');
    expect(out).toContain('输出');
  });

  // nothing marked means nothing to compress, so the key must do nothing
  it('ignores `a` when nothing is marked', async () => {
    const { lastFrame, stdin } = render(<BrowserPage initialDir={dir} />);
    await flush();
    stdin.write('a');
    await flush();
    expect(lastFrame() ?? '').not.toContain('格式');
  });

  it('names the archive after the lone marked directory', async () => {
    const { lastFrame, stdin } = render(<BrowserPage initialDir={dir} />);
    await flush();
    stdin.write(' ');
    await flush();
    stdin.write('a');
    await flush();
    expect(lastFrame() ?? '').toContain('sub.7z');
  });

  // gz and bz2 take exactly one input and throw otherwise; that must surface as
  // a message, not as a crashed render
  it('reports the adapter error instead of crashing on a format that cannot take the selection', async () => {
    const { lastFrame, stdin } = render(<BrowserPage initialDir={dir} />);
    await flush();
    stdin.write(' ');
    await flush();
    stdin.write('\x1b[B'); // down
    await flush();
    stdin.write(' ');
    await flush();
    stdin.write('a');
    await flush();
    stdin.write('\x1b[D'); // left, 7z -> zip
    await flush();
    stdin.write('\x1b[D'); // left, zip -> bz2
    await flush();
    const out = lastFrame() ?? '';
    expect(out).toContain('bz2');
    expect(out).toContain('got 2');
    // the way out must stay visible even in the error state
    expect(out).toContain('Esc');
  });

  it('edits the output name by typing once the output field has focus', async () => {
    const { lastFrame, stdin } = render(<BrowserPage initialDir={dir} />);
    await flush();
    stdin.write(' ');
    await flush();
    stdin.write('a');
    await flush();
    stdin.write('\t');
    await flush();
    stdin.write('\t');
    await flush();
    stdin.write('ZZ');
    await flush();
    expect(lastFrame() ?? '').toContain('sub.7zZZ');
  });
});

describe('BrowserPage extraction', () => {
  const wrapped = () => path.join(dir, 'wrapped.zip');
  const loose = () => path.join(dir, 'loose.zip');
  const settle = () => new Promise((r) => setTimeout(r, 400));

  /** The panel renders each field on its own line; pull the one we mean. */
  const lineWith = (frame: string, label: string): string =>
    frame.split('\n').find((l) => l.includes(label)) ?? '';

  it('enters an archive and lists its contents', async () => {
    const { lastFrame } = render(<BrowserPage initialArchive={wrapped()} />);
    await settle();
    const out = lastFrame() ?? '';
    expect(out).toContain('📦');
    expect(out).toContain('sub');
  });

  // the archive already wraps everything in "sub/", so no extra folder
  it('extracts a wrapped archive beside itself rather than into a new folder', async () => {
    const { lastFrame, stdin } = render(<BrowserPage initialArchive={wrapped()} />);
    await settle();
    stdin.write('x');
    await settle();
    const target = lineWith(lastFrame() ?? '', '目标');
    expect(target).toContain(dir);
    expect(target).not.toContain('wrapped');
  });

  // loose contents would scatter over whatever is already there
  it('extracts a loose archive into a folder named after it', async () => {
    const { lastFrame, stdin } = render(<BrowserPage initialArchive={loose()} />);
    await settle();
    stdin.write('x');
    await settle();
    expect(lineWith(lastFrame() ?? '', '目标')).toContain(path.join(dir, 'loose'));
  });

  it('offers the whole archive as the scope when nothing is marked', async () => {
    const { lastFrame, stdin } = render(<BrowserPage initialArchive={wrapped()} />);
    await settle();
    stdin.write('x');
    await settle();
    expect(lineWith(lastFrame() ?? '', '范围')).toContain('全部');
  });

  it('narrows the scope to the marked entries', async () => {
    const { lastFrame, stdin } = render(<BrowserPage initialArchive={wrapped()} />);
    await settle();
    stdin.write(' ');
    await settle();
    stdin.write('x');
    await settle();
    expect(lineWith(lastFrame() ?? '', '范围')).toContain('选中 1 项');
  });

  // pressing x with the cursor on an archive must open the same panel, not a
  // blank screen
  it('opens the extract panel from the filesystem too', async () => {
    const { lastFrame, stdin } = render(<BrowserPage initialDir={dir} />);
    await settle();
    // directories sort ahead of files and files sort by name, so wrapped.zip is
    // the last row — jumping to the end is deterministic where counting
    // keypresses or matching a cursor glyph is not
    stdin.write('G');
    await settle();
    // the detail bar names the highlighted row, which proves where the cursor is
    expect(lastFrame() ?? '').toContain(wrapped());
    stdin.write('x');
    await settle();
    const out = lastFrame() ?? '';
    expect(out).toContain('目标');
    // the same wrapped archive, so the same answer as from inside it
    expect(lineWith(out, '目标')).not.toContain('wrapped');
  });
});

describe('BrowserPage refresh after its own run', () => {
  // same wait the extraction cases use for work that leaves the render loop
  const settle = () => new Promise((r) => setTimeout(r, 400));

  /**
   * Waits for a real subprocess to put a file on disk.
   *
   * Bounded rather than open-ended so a tool that never produces the file
   * fails the assertion below instead of hanging the suite.
   */
  const waitForFile = async (file: string): Promise<void> => {
    for (let i = 0; i < 100 && !fs.existsSync(file); i += 1) {
      await flush();
    }
  };

  // the whole point of running a command from the browser is seeing its result;
  // the row list is memoised on state that a child process writing to disk
  // cannot touch, so nothing but an explicit refresh can surface the new file
  it('lists the archive it just created', async () => {
    const work = fs.mkdtempSync(path.join(os.tmpdir(), 'zt-refresh-'));
    fs.writeFileSync(path.join(work, 'payload.txt'), 'payload');
    const archive = path.join(work, 'payload.zip');
    try {
      const { lastFrame, stdin } = render(<BrowserPage initialDir={work} />);
      await settle();
      expect(lastFrame() ?? '').toContain('payload.txt');
      expect(lastFrame() ?? '').not.toContain('payload.zip');

      stdin.write(' '); // mark payload.txt, the only content row
      await flush();
      stdin.write('a'); // open the compress panel
      await flush();
      stdin.write('\x1b[D'); // left, 7z -> zip
      await flush();
      // the panel names the file the run is about to produce
      expect(lastFrame() ?? '').toContain('payload.zip');

      stdin.write('\r'); // run zip for real
      await waitForFile(archive);
      await settle();
      expect(fs.existsSync(archive)).toBe(true);

      stdin.write('\x1b'); // Esc, back to the listing
      await flush();
      expect(lastFrame() ?? '').toContain('payload.zip');
    } finally {
      fs.rmSync(work, { recursive: true, force: true });
    }
    // every BrowserPage rendered earlier in this file is still mounted and
    // subscribed to the execution store, so a real run re-renders all of them
    // on each process event — far slower here than the same run in isolation
  }, 30_000);
});
