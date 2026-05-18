import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { render } from 'ink-testing-library';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { initI18n } from '../../../src/infra/i18n';
import { FilePicker } from '../../../src/tui/components/FilePicker';

const KEY_DOWN = '[B';
const KEY_ESC = '';
const KEY_ENTER = '\r';

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 40));

let tmp: string;

function setupFixture(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zt-picker-'));
  fs.writeFileSync(path.join(dir, 'doc.txt'), 'hi');
  fs.writeFileSync(path.join(dir, 'pkg.zip'), Buffer.alloc(4));
  fs.writeFileSync(path.join(dir, 'data.7z'), Buffer.alloc(4));
  fs.mkdirSync(path.join(dir, 'sub'));
  fs.writeFileSync(path.join(dir, 'sub', 'inner.txt'), 'x');
  return dir;
}

describe('FilePicker', () => {
  beforeAll(async () => {
    await initI18n('en');
  });
  beforeEach(() => {
    tmp = setupFixture();
  });
  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  describe('openFile mode', () => {
    it('renders title, cwd, and filtered file list', () => {
      const { lastFrame } = render(
        <FilePicker
          mode="openFile"
          initialPath={tmp}
          filterExtensions={['.zip', '.7z']}
          onConfirm={() => {}}
          onCancel={() => {}}
        />,
      );
      const out = lastFrame() ?? '';
      expect(out).toContain('Open file');
      expect(out).toContain(tmp);
      expect(out).toContain('pkg.zip');
      expect(out).toContain('data.7z');
      expect(out).not.toContain('doc.txt');
      expect(out).toContain('archives only');
    });

    it('toggles the extension filter on *', async () => {
      const { lastFrame, stdin } = render(
        <FilePicker
          mode="openFile"
          initialPath={tmp}
          filterExtensions={['.zip']}
          onConfirm={() => {}}
          onCancel={() => {}}
        />,
      );
      expect(lastFrame()).not.toContain('doc.txt');
      stdin.write('*');
      await flush();
      expect(lastFrame()).toContain('doc.txt');
      expect(lastFrame()).toContain('all files');
    });

    it('confirms a file on Enter', async () => {
      const onConfirm = vi.fn();
      const { stdin } = render(
        <FilePicker
          mode="openFile"
          initialPath={tmp}
          filterExtensions={['.zip', '.7z']}
          onConfirm={onConfirm}
          onCancel={() => {}}
        />,
      );
      // sort order with parent prefix: .. , sub/, data.7z, pkg.zip
      // step down 3 times to land on pkg.zip
      stdin.write(KEY_DOWN);
      await flush();
      stdin.write(KEY_DOWN);
      await flush();
      stdin.write(KEY_DOWN);
      await flush();
      stdin.write(KEY_ENTER);
      await flush();
      expect(onConfirm).toHaveBeenCalledWith(path.join(tmp, 'pkg.zip'));
    });

    it('navigates into a subdirectory on Enter', async () => {
      const { lastFrame, stdin } = render(
        <FilePicker mode="openFile" initialPath={tmp} onConfirm={() => {}} onCancel={() => {}} />,
      );
      stdin.write(KEY_DOWN);
      await flush();
      stdin.write(KEY_ENTER);
      await flush();
      const out = lastFrame() ?? '';
      expect(out).toContain(path.join(tmp, 'sub'));
      expect(out).toContain('inner.txt');
    });
  });

  describe('openDir mode', () => {
    it('shows only directories', () => {
      const { lastFrame } = render(
        <FilePicker mode="openDir" initialPath={tmp} onConfirm={() => {}} onCancel={() => {}} />,
      );
      const out = lastFrame() ?? '';
      expect(out).toContain('sub');
      expect(out).not.toContain('pkg.zip');
      expect(out).not.toContain('doc.txt');
    });

    it('confirms current cwd on d', async () => {
      const onConfirm = vi.fn();
      const { stdin } = render(
        <FilePicker mode="openDir" initialPath={tmp} onConfirm={onConfirm} onCancel={() => {}} />,
      );
      stdin.write('d');
      await flush();
      expect(onConfirm).toHaveBeenCalledWith(tmp);
    });
  });

  describe('saveFile mode', () => {
    it('renders default filename', () => {
      const { lastFrame } = render(
        <FilePicker mode="saveFile" initialPath={tmp} onConfirm={() => {}} onCancel={() => {}} />,
      );
      const out = lastFrame() ?? '';
      expect(out).toContain('Save as');
      expect(out).toContain('archive.7z');
    });

    it('confirms via d shortcut joining cwd + filename', async () => {
      const onConfirm = vi.fn();
      const { stdin } = render(
        <FilePicker
          mode="saveFile"
          initialPath={tmp}
          defaultFilename="out.zip"
          onConfirm={onConfirm}
          onCancel={() => {}}
        />,
      );
      stdin.write('d');
      await flush();
      expect(onConfirm).toHaveBeenCalledWith(path.join(tmp, 'out.zip'));
    });

    it('honors filterExtensions to hide non-matching files in the list', () => {
      const { lastFrame } = render(
        <FilePicker
          mode="saveFile"
          initialPath={tmp}
          filterExtensions={['.7z']}
          onConfirm={() => {}}
          onCancel={() => {}}
        />,
      );
      const out = lastFrame() ?? '';
      expect(out).toContain('data.7z');
      expect(out).not.toContain('pkg.zip');
      expect(out).not.toContain('doc.txt');
      expect(out).toContain('archives only');
    });

    it('clears the empty-filename error when the user navigates directories', async () => {
      const { lastFrame, stdin } = render(
        <FilePicker
          mode="saveFile"
          initialPath={tmp}
          defaultFilename="   "
          onConfirm={() => {}}
          onCancel={() => {}}
        />,
      );
      stdin.write('d');
      await flush();
      expect(lastFrame()).toContain('Filename cannot be empty');
      stdin.write('~');
      await flush();
      expect(lastFrame()).not.toContain('Filename cannot be empty');
    });

    it('blocks confirm when filename is whitespace and surfaces the error', async () => {
      const onConfirm = vi.fn();
      const { lastFrame, stdin } = render(
        <FilePicker
          mode="saveFile"
          initialPath={tmp}
          defaultFilename="   "
          onConfirm={onConfirm}
          onCancel={() => {}}
        />,
      );
      stdin.write('d');
      await flush();
      expect(onConfirm).not.toHaveBeenCalled();
      expect(lastFrame()).toContain('Filename cannot be empty');
    });
  });

  describe('multiSelect mode', () => {
    it('renders checkboxes and a selected counter', () => {
      const { lastFrame } = render(
        <FilePicker
          mode="multiSelect"
          initialPath={tmp}
          onConfirm={() => {}}
          onCancel={() => {}}
        />,
      );
      const out = lastFrame() ?? '';
      expect(out).toContain('Select files');
      expect(out).toContain('[ ]');
      expect(out).toContain('Selected: 0');
    });

    it('selects all entries on a and confirms on d', async () => {
      const onConfirm = vi.fn();
      const { stdin } = render(
        <FilePicker
          mode="multiSelect"
          initialPath={tmp}
          onConfirm={onConfirm}
          onCancel={() => {}}
        />,
      );
      stdin.write('a');
      await flush();
      stdin.write('d');
      await flush();
      expect(onConfirm).toHaveBeenCalledOnce();
      const arg = onConfirm.mock.calls[0]?.[0] as string[];
      expect(arg).toContain(path.join(tmp, 'sub'));
      expect(arg).toContain(path.join(tmp, 'pkg.zip'));
      expect(arg).toContain(path.join(tmp, 'data.7z'));
      expect(arg).toContain(path.join(tmp, 'doc.txt'));
      // parent virtual entry must never be in the result
      expect(arg.some((p) => p === '__parent__')).toBe(false);
    });

    it('toggles selection on space and clears on c', async () => {
      const onConfirm = vi.fn();
      const { stdin, lastFrame } = render(
        <FilePicker
          mode="multiSelect"
          initialPath={tmp}
          onConfirm={onConfirm}
          onCancel={() => {}}
        />,
      );
      // move down past the parent entry, then toggle
      stdin.write(KEY_DOWN);
      await flush();
      stdin.write(' ');
      await flush();
      expect(lastFrame()).toContain('Selected: 1');
      stdin.write('c');
      await flush();
      expect(lastFrame()).toContain('Selected: 0');
    });
  });

  describe('navigation shortcuts', () => {
    it('jumps to $HOME on ~', async () => {
      const { lastFrame, stdin } = render(
        <FilePicker mode="openDir" initialPath={tmp} onConfirm={() => {}} onCancel={() => {}} />,
      );
      stdin.write('~');
      await flush();
      expect(lastFrame()).toContain(os.homedir());
    });

    it('cancels on Esc', async () => {
      const onCancel = vi.fn();
      const { stdin } = render(
        <FilePicker mode="openFile" initialPath={tmp} onConfirm={() => {}} onCancel={onCancel} />,
      );
      stdin.write(KEY_ESC);
      await flush();
      expect(onCancel).toHaveBeenCalled();
    });

    it('navigates up via .. entry', async () => {
      const sub = path.join(tmp, 'sub');
      const { lastFrame, stdin } = render(
        <FilePicker mode="openDir" initialPath={sub} onConfirm={() => {}} onCancel={() => {}} />,
      );
      // cursor at 0 = "..", press Enter
      stdin.write(KEY_ENTER);
      await flush();
      expect(lastFrame()).toContain(tmp);
    });
  });
});
