import { EventEmitter } from 'node:events';
import { Box, render, Text } from 'ink';
import type React from 'react';
import { beforeAll, describe, expect, it } from 'vitest';
import type { BuiltCommand } from '../../../src/engine/types';
import { initI18n, t } from '../../../src/infra/i18n';
import { ActionPanel } from '../../../src/tui/components/ActionPanel';
import { AddressBar } from '../../../src/tui/components/AddressBar';
import { Divider } from '../../../src/tui/components/Divider';
import { EntryDetails } from '../../../src/tui/components/EntryDetails';
import { fitPageSize } from '../../../src/tui/components/fitPageSize';
import type { TreeNode } from '../../../src/tui/components/VirtualTree';
import { VirtualTree } from '../../../src/tui/components/VirtualTree';
import { CHROME_ROWS, PANEL_CHROME } from '../../../src/tui/pages/BrowserPage';

/**
 * BrowserPage owns its listing internally, so its rows cannot be driven from a
 * test. These mirror the page's layout with the same components to pin the one
 * thing that breaks the screen silently: whether the row budgets still match
 * what the surrounding elements actually occupy.
 *
 * The budgets are imported rather than copied, so the two cannot drift apart.
 * The render trees below still have to be kept in step with the page's own.
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

function frameOf(rows: number, tree: React.ReactElement): string {
  const stdout = new SizedStdout(rows);
  const instance = render(tree, {
    stdout: stdout as unknown as NodeJS.WriteStream,
    stdin: new InertStdin() as unknown as NodeJS.ReadStream,
    patchConsole: false,
    interactive: false,
    exitOnCtrlC: false,
  });
  instance.unmount();
  return stdout.frames.join('');
}

const nodes: TreeNode[] = Array.from({ length: 500 }, (_, i) => ({
  id: `/w/file-${i}.txt`,
  label: `file-${i}.txt`,
  isDir: false,
  size: 100,
  depth: 0,
  sizeLabel: '100 B',
}));

function browserFrame(rows: number): string {
  const pageSize = fitPageSize(rows, CHROME_ROWS);
  // mirrors BrowserPage: the padding comes from App, the rest from the page
  return frameOf(
    rows,
    <Box flexDirection="column" padding={1} height={rows}>
      <Box flexDirection="column">
        <AddressBar kind="fs" label="/w/proj" countLabel="2 已选" />
        <Divider />
        <Box flexDirection="column">
          <VirtualTree
            nodes={nodes}
            pageSize={pageSize}
            selectedIndex={0}
            showSize
            showDirMarker={false}
            countLabel={t('browser.itemCount', { total: nodes.length, shown: pageSize })}
          />
        </Box>
        <Box marginTop={1}>
          <EntryDetails
            path="/w/file-0.txt"
            isDir={false}
            size={100}
            modified={new Date(2026, 7, 26, 15, 3)}
            emptyLabel={t('browser.detailEmpty')}
          />
        </Box>
        <Divider />
        <Text dimColor wrap="truncate">
          {t('browser.hintFs')}
        </Text>
      </Box>
    </Box>,
  );
}

// a long input list is what pushed the panel to 29 rows on a 24-row terminal
const LONG_COMMAND: BuiltCommand = {
  cmd: '7z',
  args: [
    'a',
    '-t7z',
    '-mx=6',
    '/w/proj/out.7z',
    ...Array.from({ length: 20 }, (_, i) => `/w/proj/src/module-${i}/index.ts`),
  ],
};

function panelFrame(rows: number, previewRows: number | undefined): string {
  return frameOf(
    rows,
    <Box flexDirection="column" padding={1} height={rows}>
      <ActionPanel
        kind="compress"
        title={t('action.compressTitle', { count: 20 })}
        format="7z"
        level={6}
        output="/w/proj/out.7z"
        focusField={0}
        command={LONG_COMMAND}
        previewRows={previewRows}
      />
    </Box>,
  );
}

describe('BrowserPage layout budget', () => {
  beforeAll(async () => {
    await initI18n('zh');
  });

  /**
   * The outer fixed-height box clips whatever does not fit, so a row count can
   * never exceed the terminal and proves nothing. An over-long list instead
   * pushes the bottom elements off screen — that is what to assert on.
   */
  it('keeps the detail bar and hint on screen at every height', () => {
    for (const rows of [24, 40, 60]) {
      const frame = browserFrame(rows);
      expect(frame, `detail bar pushed off a ${rows}-row terminal`).toContain('/w/file-0.txt');
      expect(frame, `hint pushed off a ${rows}-row terminal`).toContain('退出');
      expect(frame, `rules pushed off a ${rows}-row terminal`).toContain('───');
    }
  });

  // the fixed-height box makes the frame exactly `rows` lines whatever the
  // budget says, so this guards the harness rather than the budget: it catches
  // a frame that stopped filling the window, not one that overflows it
  it('does not waste rows: the list claims everything left over', () => {
    for (const rows of [24, 40, 60]) {
      const lines = browserFrame(rows).replace(/\n$/, '').split('\n').length;
      expect(lines, `wasted rows on a ${rows}-row terminal`).toBeGreaterThanOrEqual(rows - 1);
    }
  });

  it('draws both rules', () => {
    expect(
      browserFrame(40)
        .split('\n')
        .filter((l) => l.includes('───')).length,
    ).toBe(2);
  });
});

describe('ActionPanel height budget', () => {
  beforeAll(async () => {
    await initI18n('zh');
  });

  /**
   * A panel with no visible way out traps the user, so the preview is what gets
   * clipped, never the controls.
   *
   * Measured caveat: at this stdout width the 20-input command above wraps to
   * nine preview lines, making the whole panel 20 rows — it fits a 24-row
   * terminal, so dropping `previewRows` changes nothing and these two
   * assertions currently hold either way. They start discriminating once the
   * preview exceeds roughly 13 wrapped lines (about 40 inputs at 100 columns):
   * without a budget the fields and the hint are then overwritten by command
   * text. Treat this case as pinning the panel's shape, not as proof that the
   * clipping works.
   */
  it('keeps the control hint on screen at every height', () => {
    for (const rows of [24, 40, 60]) {
      const frame = panelFrame(rows, Math.max(2, rows - PANEL_CHROME));
      expect(frame, `control hint pushed off a ${rows}-row terminal`).toContain('Esc');
      expect(frame, `command preview missing on a ${rows}-row terminal`).toContain('7z');
    }
  });

  // same caveat as above: the outer box clamps the frame, so this is a floor on
  // the harness. Panel overflow shows up as corrupted rows, not as extra ones.
  it('stays inside the terminal', () => {
    for (const rows of [24, 40, 60]) {
      const lines = panelFrame(rows, Math.max(2, rows - PANEL_CHROME))
        .replace(/\n$/, '')
        .split('\n').length;
      expect(lines, `panel overflowed a ${rows}-row terminal`).toBeLessThanOrEqual(rows);
    }
  });
});
