import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { render } from 'ink-testing-library';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { changeLanguage, initI18n } from '../../../src/infra/i18n';
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

    it('confirms a file on Space', async () => {
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
      // .. , sub/, data.7z, pkg.zip  → 3 downs to pkg.zip
      stdin.write('\x1b[B');
      await flush();
      stdin.write('\x1b[B');
      await flush();
      stdin.write('\x1b[B');
      await flush();
      stdin.write(' ');
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

    it('renders the localized item count label (i18n actually applied)', async () => {
      await changeLanguage('zh');
      const { lastFrame } = render(
        <FilePicker mode="openFile" initialPath={tmp} onConfirm={() => {}} onCancel={() => {}} />,
      );
      expect(lastFrame() ?? '').toContain('项');
      await changeLanguage('en');
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

    it('confirms the directory under the cursor on Space', async () => {
      const onConfirm = vi.fn();
      const { stdin } = render(
        <FilePicker mode="openDir" initialPath={tmp} onConfirm={onConfirm} onCancel={() => {}} />,
      );
      // cursor 0 = "..", down to "sub"
      stdin.write('\x1b[B');
      await flush();
      stdin.write(' ');
      await flush();
      expect(onConfirm).toHaveBeenCalledWith(path.join(tmp, 'sub'));
    });

    it('does nothing when Space is pressed on the parent entry', async () => {
      const onConfirm = vi.fn();
      const { stdin } = render(
        <FilePicker
          mode="openDir"
          initialPath={path.join(tmp, 'sub')}
          onConfirm={onConfirm}
          onCancel={() => {}}
        />,
      );
      stdin.write(' '); // cursor on ".."
      await flush();
      expect(onConfirm).not.toHaveBeenCalled();
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

    it('confirms via Enter while the filename input has focus', async () => {
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
      stdin.write(KEY_ENTER);
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
      stdin.write(KEY_ENTER);
      await flush();
      expect(lastFrame()).toContain('Filename cannot be empty');
      stdin.write('\t');
      await flush();
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
      stdin.write(KEY_ENTER);
      await flush();
      expect(onConfirm).not.toHaveBeenCalled();
      expect(lastFrame()).toContain('Filename cannot be empty');
    });
  });

  describe('multiSelect mode', () => {
    it('renders the selected pane title', () => {
      const { lastFrame } = render(
        <FilePicker
          mode="multiSelect"
          initialPath={tmp}
          onConfirm={() => {}}
          onCancel={() => {}}
        />,
      );
      const out = lastFrame() ?? '';
      expect(out).toContain('Choose what to compress');
      expect(out).toContain('Selected (0)');
    });

    it('adds the cursor item to the selected pane on Space', async () => {
      const { lastFrame, stdin } = render(
        <FilePicker
          mode="multiSelect"
          initialPath={tmp}
          onConfirm={() => {}}
          onCancel={() => {}}
        />,
      );
      stdin.write('\x1b[B');
      await flush(); // .. -> sub
      stdin.write(' ');
      await flush();
      const out = lastFrame() ?? '';
      expect(out).toContain('Selected (1)');
      expect(out).toContain(`[D] ${path.join(tmp, 'sub')}`);
    });

    it('submits selected items when Enter is pressed in the selected pane', async () => {
      const onConfirm = vi.fn();
      const { stdin } = render(
        <FilePicker
          mode="multiSelect"
          initialPath={tmp}
          onConfirm={onConfirm}
          onCancel={() => {}}
        />,
      );
      stdin.write('\x1b[B');
      await flush(); // sub
      stdin.write(' ');
      await flush(); // select sub
      stdin.write('\t');
      await flush(); // focus selected pane
      stdin.write('\r');
      await flush(); // submit
      expect(onConfirm).toHaveBeenCalledOnce();
      expect(onConfirm.mock.calls[0]?.[0]).toEqual([path.join(tmp, 'sub')]);
    });

    it('removes an item from the selected pane on Space', async () => {
      const { lastFrame, stdin } = render(
        <FilePicker
          mode="multiSelect"
          initialPath={tmp}
          onConfirm={() => {}}
          onCancel={() => {}}
        />,
      );
      stdin.write('\x1b[B');
      await flush();
      stdin.write(' ');
      await flush(); // select sub
      stdin.write('\t');
      await flush(); // focus selected
      stdin.write(' ');
      await flush(); // remove under cursor
      expect(lastFrame() ?? '').toContain('Selected (0)');
      expect(lastFrame() ?? '').not.toContain(`[D] ${path.join(tmp, 'sub')}`);
    });

    it('removes an item from the selected pane on d', async () => {
      const { lastFrame, stdin } = render(
        <FilePicker
          mode="multiSelect"
          initialPath={tmp}
          onConfirm={() => {}}
          onCancel={() => {}}
        />,
      );
      stdin.write('\x1b[B');
      await flush();
      stdin.write(' ');
      await flush(); // select sub
      stdin.write('\t');
      await flush(); // focus selected
      stdin.write('d');
      await flush(); // remove under cursor with d
      expect(lastFrame() ?? '').toContain('Selected (0)');
      expect(lastFrame() ?? '').not.toContain(`[D] ${path.join(tmp, 'sub')}`);
    });

    it('preserves selection order when submitting multiple items', async () => {
      const onConfirm = vi.fn();
      const { stdin } = render(
        <FilePicker
          mode="multiSelect"
          initialPath={tmp}
          onConfirm={onConfirm}
          onCancel={() => {}}
        />,
      );
      // list order: .., sub/, data.7z, doc.txt, pkg.zip (dirs first, then alpha)
      stdin.write('\x1b[B');
      await flush(); // -> sub
      stdin.write(' ');
      await flush(); // select sub (first)
      stdin.write('\x1b[B');
      await flush(); // -> data.7z
      stdin.write(' ');
      await flush(); // select data.7z (second)
      stdin.write('\t');
      await flush(); // focus selected pane
      stdin.write('\r');
      await flush(); // submit
      expect(onConfirm).toHaveBeenCalledOnce();
      expect(onConfirm.mock.calls[0]?.[0]).toEqual([
        path.join(tmp, 'sub'),
        path.join(tmp, 'data.7z'),
      ]);
    });

    it('blocks submit and shows an error when nothing is selected', async () => {
      const onConfirm = vi.fn();
      const { lastFrame, stdin } = render(
        <FilePicker
          mode="multiSelect"
          initialPath={tmp}
          onConfirm={onConfirm}
          onCancel={() => {}}
        />,
      );
      stdin.write('\t');
      await flush(); // focus empty selected pane
      stdin.write('\r');
      await flush(); // attempt submit
      expect(onConfirm).not.toHaveBeenCalled();
      expect(lastFrame() ?? '').toContain('Select at least one item');
    });

    it('auto-locates to the parent and preselects the source on open', () => {
      const sub = path.join(tmp, 'sub');
      const { lastFrame } = render(
        <FilePicker
          mode="multiSelect"
          initialPath={tmp}
          preselectPath={sub}
          onConfirm={() => {}}
          onCancel={() => {}}
        />,
      );
      const out = lastFrame() ?? '';
      expect(out).toContain('Selected (1)');
      expect(out).toContain(`[D] ${sub}`);
    });
  });

  describe('hint text (new keymap)', () => {
    it('shows the new navigation hint in openDir mode', () => {
      const { lastFrame } = render(
        <FilePicker mode="openDir" initialPath={tmp} onConfirm={() => {}} onCancel={() => {}} />,
      );
      const out = lastFrame() ?? '';
      expect(out).toContain('Space');
      expect(out).not.toContain('d confirm');
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
      // the cwd must have moved off sub (full child path no longer rendered as cwd)
      expect(lastFrame() ?? '').not.toContain(`📂 ${sub}`);
    });

    it('enters a directory on right arrow', async () => {
      const { lastFrame, stdin } = render(
        <FilePicker mode="openDir" initialPath={tmp} onConfirm={() => {}} onCancel={() => {}} />,
      );
      // openDir lists only dirs; cursor 0 = "..", press down to "sub", then right
      stdin.write('\x1b[B');
      await flush();
      stdin.write('\x1b[C');
      await flush();
      expect(lastFrame() ?? '').toContain(path.join(tmp, 'sub'));
    });

    it('goes up on left arrow', async () => {
      const sub = path.join(tmp, 'sub');
      const { lastFrame, stdin } = render(
        <FilePicker mode="openDir" initialPath={sub} onConfirm={() => {}} onCancel={() => {}} />,
      );
      stdin.write('\x1b[D');
      await flush();
      expect(lastFrame() ?? '').toContain(tmp);
      expect(lastFrame() ?? '').not.toContain(`📂 ${sub}`);
    });

    it('goes up on backspace', async () => {
      const sub = path.join(tmp, 'sub');
      const { lastFrame, stdin } = render(
        <FilePicker mode="openDir" initialPath={sub} onConfirm={() => {}} onCancel={() => {}} />,
      );
      stdin.write('\x7f');
      await flush();
      expect(lastFrame() ?? '').toContain(tmp);
      expect(lastFrame() ?? '').not.toContain(`📂 ${sub}`);
    });
  });
});
