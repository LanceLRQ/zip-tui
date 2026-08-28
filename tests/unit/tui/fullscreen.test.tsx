import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Box, render } from 'ink';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { initI18n } from '../../../src/infra/i18n';
import { BrowserPage } from '../../../src/tui/pages/BrowserPage';

/**
 * ink-testing-library's stdout stub hard-codes `columns` and has no `rows`, so
 * Ink falls back to the real terminal size. Verifying height-driven layout
 * needs a stream whose height we choose.
 *
 * Rendering non-interactively matters too: in interactive mode Ink splits one
 * repaint across several writes (the last being just a sync marker), whereas
 * non-interactive emits a single complete frame at unmount.
 */
class SizedStdout extends EventEmitter {
  columns = 100;
  rows: number;
  frames: string[] = [];
  isTTY = true;

  constructor(rows: number) {
    super();
    this.rows = rows;
  }

  write = (frame: string): boolean => {
    this.frames.push(frame);
    return true;
  };
}

class InertStdin extends EventEmitter {
  isTTY = true;
  setEncoding() {}
  setRawMode() {}
  resume() {}
  pause() {}
  ref() {}
  unref() {}
  read() {
    return null;
  }
}

function frameAtHeight(rows: number, dir: string): string {
  const stdout = new SizedStdout(rows);
  const instance = render(
    // BrowserPage relies on App for the outer frame, so the wrapper has to be
    // reproduced here or the page has nothing to size itself against
    <Box flexDirection="column" padding={1} height={rows}>
      <BrowserPage initialDir={dir} />
    </Box>,
    {
      stdout: stdout as unknown as NodeJS.WriteStream,
      stdin: new InertStdin() as unknown as NodeJS.ReadStream,
      patchConsole: false,
      interactive: false,
      exitOnCtrlC: false,
    },
  );
  instance.unmount();
  return stdout.frames.join('');
}

/** The item-count line reads "N 项, 显示 M"; pull out M. */
function shownCount(frame: string): number {
  const m = frame.match(/显示\s*(\d+)/);
  return m ? Number.parseInt(m[1] ?? '0', 10) : -1;
}

/**
 * Count entry rows by their `[ ]` / `[x]` marker. Below a certain height the
 * outer fixed-height Box clips the count line away, so the marker is the only
 * evidence left that the list itself still rendered.
 */
function listedRows(frame: string): number {
  return frame.split('\n').filter((line) => /\[[ x]\]/.test(line)).length;
}

describe('terminal height drives list size', () => {
  let tmp: string;

  beforeAll(async () => {
    await initI18n('zh');
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zt-fs-'));
    // more entries than any window under test, so the window is the limit
    for (let i = 0; i < 80; i++) {
      fs.writeFileSync(path.join(tmp, `file-${String(i).padStart(3, '0')}.txt`), 'x');
    }
  });

  afterAll(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('shows more entries on a taller terminal', () => {
    const short = shownCount(frameAtHeight(24, tmp));
    const tall = shownCount(frameAtHeight(50, tmp));
    expect(short).toBeGreaterThan(0);
    expect(tall).toBeGreaterThan(short);
  });

  it('keeps the frame within the terminal height', () => {
    for (const rows of [24, 40, 60]) {
      const lines = frameAtHeight(rows, tmp).replace(/\n$/, '').split('\n').length;
      expect(lines, `frame overflowed a ${rows}-row terminal`).toBeLessThanOrEqual(rows);
    }
  });

  it('still renders a usable list when the terminal is shorter than the chrome', () => {
    expect(listedRows(frameAtHeight(6, tmp))).toBeGreaterThan(0);
  });
});
