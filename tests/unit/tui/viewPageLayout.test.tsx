import { EventEmitter } from 'node:events';
import { Box, render, Text } from 'ink';
import { beforeAll, describe, expect, it } from 'vitest';
import { initI18n, t } from '../../../src/infra/i18n';
import { Divider } from '../../../src/tui/components/Divider';
import { EntryDetails } from '../../../src/tui/components/EntryDetails';
import { fitPageSize } from '../../../src/tui/components/fitPageSize';
import type { TreeNode } from '../../../src/tui/components/VirtualTree';
import { VirtualTree } from '../../../src/tui/components/VirtualTree';

/**
 * ViewPage keeps its loaded state internally, so its list cannot be driven
 * from a test directly. This mirrors the page's layout with the same
 * components to check the one thing that silently breaks the screen: whether
 * CHROME_ROWS still matches what the surrounding elements actually occupy.
 *
 * The budget is imported rather than copied, so the two cannot drift apart.
 * The render tree below still has to be kept in step with the page's own.
 */
import { CHROME_ROWS } from '../../../src/tui/pages/ViewPage';

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

const nodes: TreeNode[] = Array.from({ length: 500 }, (_, i) => ({
  id: `dir/file-${i}.txt`,
  label: `file-${i}.txt`,
  isDir: false,
  size: 100,
  depth: 1,
  sizeLabel: '100 B',
}));

function renderPage(rows: number): string {
  const pageSize = fitPageSize(rows, CHROME_ROWS);
  const stdout = new SizedStdout(rows);
  const instance = render(
    // mirrors ViewPage: padding comes from App, the rest from the page itself
    <Box flexDirection="column" padding={1} height={rows}>
      <Box flexDirection="column">
        <Text wrap="truncate-start">查看压缩包: /tmp/archive.7z</Text>
        <Divider />
        <Box flexDirection="column">
          <VirtualTree
            nodes={nodes}
            pageSize={pageSize}
            selectedIndex={0}
            showSize
            showDirMarker={false}
            showExpandMarker
            countLabel={t('view.itemCount', { total: nodes.length, shown: pageSize })}
          />
        </Box>
        <Box marginTop={1}>
          <EntryDetails
            path="dir/file-0.txt"
            isDir={false}
            size={100}
            modified={new Date(2026, 7, 26, 15, 3)}
            emptyLabel={t('view.detailEmpty')}
          />
        </Box>
        <Divider />
        <Text dimColor wrap="truncate">
          {t('view.hintTree')}
        </Text>
      </Box>
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

describe('ViewPage layout budget', () => {
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
      const frame = renderPage(rows);
      expect(frame, `detail bar pushed off a ${rows}-row terminal`).toContain('dir/file-0.txt');
      expect(frame, `hint pushed off a ${rows}-row terminal`).toContain('↑↓');
      expect(frame, `rules pushed off a ${rows}-row terminal`).toContain('───');
    }
  });

  it('does not waste rows: the list claims everything left over', () => {
    for (const rows of [24, 40, 60]) {
      const lines = renderPage(rows).replace(/\n$/, '').split('\n').length;
      expect(lines, `wasted rows on a ${rows}-row terminal`).toBeGreaterThanOrEqual(rows - 1);
    }
  });

  it('draws both rules', () => {
    expect(
      renderPage(40)
        .split('\n')
        .filter((l) => l.includes('───')).length,
    ).toBe(2);
  });
});
