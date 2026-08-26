import { Box, Text, useInput } from 'ink';
import type React from 'react';
import { useMemo, useState } from 'react';
import { buildDefaultRegistry } from '../../engine/builder.js';
import { runCommand } from '../../engine/executor.js';
import { MVP_ARCHIVE_EXTENSIONS } from '../../engine/types.js';
import { useAppStore } from '../../store/index.js';
import {
  type ArchiveListing,
  buildArchiveTree,
  entriesToFlatNodes,
  flattenTree,
  initialExpanded,
  loadArchiveListing,
  parentPathOf,
} from '../components/archiveTree.js';
import { FilePicker } from '../components/FilePicker.js';
import { fitPageSize } from '../components/fitPageSize.js';
import { moveCursor, type ScrollAction } from '../components/scrollCursor.js';
import { VirtualTree } from '../components/VirtualTree.js';
import { useT } from '../hooks/useI18n.js';
import { useTerminalRows } from '../hooks/useTerminalRows.js';

// rows this page spends on things that are not list entries: the app's padding
// (2), the archive path (1), the gap above the list (1), the item count (1),
// and the gap plus hint line at the bottom (2)
const CHROME_ROWS = 7;

type ViewMode = 'tree' | 'flat';

export const ViewPage: React.FC = () => {
  const t = useT();
  const setRoute = useAppStore((s) => s.setRoute);
  const [archive, setArchive] = useState('');
  const [listing, setListing] = useState<ArchiveListing | null>(null);
  const [cursor, setCursor] = useState(0);
  const [mode, setMode] = useState<ViewMode>('tree');
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const rows = useTerminalRows();

  const entries = listing?.entries ?? [];
  const tree = useMemo(() => buildArchiveTree(entries), [entries]);
  const nodes = useMemo(
    () => (mode === 'tree' ? flattenTree(tree, expanded) : entriesToFlatNodes(entries)),
    [mode, tree, expanded, entries],
  );
  const total = nodes.length;
  const pageSize = fitPageSize(rows, CHROME_ROWS);
  // the list shrinks when a directory closes, so never point past its end
  const safeCursor = Math.min(cursor, Math.max(0, total - 1));

  const setOpen = (path: string, open: boolean): void => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (open) next.add(path);
      else next.delete(path);
      return next;
    });
  };

  /** Moves the cursor onto `path`, if it is currently visible. */
  const focusPath = (path: string): void => {
    const idx = nodes.findIndex((n) => n.id === path);
    if (idx >= 0) setCursor(idx);
  };

  useInput(
    (input, key) => {
      if (key.escape) {
        setRoute('menu');
        return;
      }

      if (input === 't') {
        setMode((m) => (m === 'tree' ? 'flat' : 'tree'));
        setCursor(0);
        return;
      }

      const node = nodes[safeCursor];

      if (mode === 'tree' && node) {
        if (key.rightArrow) {
          if (node.isDir) setOpen(node.id, true);
          return;
        }
        if (key.leftArrow) {
          // closing what is open, otherwise stepping out to the parent — the
          // usual behaviour of a tree pane
          if (node.isDir && node.expanded) setOpen(node.id, false);
          else {
            const parent = parentPathOf(node.id);
            if (parent) focusPath(parent);
          }
          return;
        }
        if (key.return) {
          if (node.isDir) setOpen(node.id, !node.expanded);
          return;
        }
      }

      let action: ScrollAction | null = null;
      if (key.upArrow) action = 'up';
      else if (key.downArrow) action = 'down';
      else if (key.pageUp) action = 'pageUp';
      else if (key.pageDown) action = 'pageDown';
      else if (input === 'g') action = 'home';
      else if (input === 'G') action = 'end';
      if (action) setCursor((c) => moveCursor(c, total, action, pageSize));
    },
    { isActive: archive !== '' },
  );

  if (archive === '') {
    return (
      <Box flexDirection="column">
        <Text>{t('menu.view')}</Text>
        <FilePicker
          mode="openFile"
          filterExtensions={[...MVP_ARCHIVE_EXTENSIONS]}
          onConfirm={async (p) => {
            setArchive(p);
            setListing(null);
            setCursor(0);
            const result = await loadArchiveListing(p, buildDefaultRegistry(), runCommand);
            setListing(result);
            setExpanded(initialExpanded(buildArchiveTree(result.entries)));
          }}
          onCancel={() => setRoute('menu')}
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text>
        {t('menu.view')}: {archive}
      </Text>
      <Box flexDirection="column" marginTop={1}>
        {listing === null ? (
          <Text dimColor>{t('view.loading')}</Text>
        ) : !listing.ok ? (
          <Text color="red">
            {t('view.failed')}: {listing.error}
          </Text>
        ) : total === 0 ? (
          <Text dimColor>{t('view.empty')}</Text>
        ) : (
          <VirtualTree
            nodes={nodes}
            pageSize={pageSize}
            selectedIndex={safeCursor}
            showSize
            showDirMarker={false}
            showExpandMarker={mode === 'tree'}
            countLabel={t('view.itemCount', {
              total,
              shown: Math.min(pageSize, total),
            })}
          />
        )}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>{t(mode === 'tree' ? 'view.hintTree' : 'view.hintFlat')}</Text>
      </Box>
    </Box>
  );
};
