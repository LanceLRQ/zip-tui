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
  collapseParent,
  entriesToFlatNodes,
  flattenTree,
  initialExpanded,
  loadArchiveListing,
  parentPathOf,
} from '../components/archiveTree.js';
import { Divider } from '../components/Divider.js';
import { EntryDetails } from '../components/EntryDetails.js';
import { FilePicker } from '../components/FilePicker.js';
import { fitPageSize } from '../components/fitPageSize.js';
import { moveCursor, type ScrollAction } from '../components/scrollCursor.js';
import { VirtualTree } from '../components/VirtualTree.js';
import { useT } from '../hooks/useI18n.js';
import { useTerminalRows } from '../hooks/useTerminalRows.js';

// rows this page spends on things that are not list entries: the app's padding
// (2), the archive path (1), the rule under it (1), the item count (1), the gap
// plus the two-line detail bar (3), the rule above the hint (1), and the hint
// itself (1)
export const CHROME_ROWS = 10;

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

  // timestamps live on the original entries, not on the rendered rows
  const entryByPath = useMemo(() => {
    const map = new Map<string, (typeof entries)[number]>();
    for (const e of entries) {
      // zip reports directories with a trailing slash; the tree drops it
      map.set(e.path.replace(/\/+$/, ''), e);
    }
    return map;
  }, [entries]);

  const childCountByPath = useMemo(() => {
    const map = new Map<string, number>();
    const walk = (branch: readonly { path: string; children: readonly unknown[] }[]): void => {
      for (const n of branch) {
        map.set(n.path, n.children.length);
        walk(n.children as typeof branch);
      }
    };
    walk(tree);
    return map;
  }, [tree]);

  const focused = nodes[safeCursor];
  const focusedEntry = focused ? entryByPath.get(focused.id) : undefined;
  const focusedChildren = focused?.isDir ? childCountByPath.get(focused.id) : undefined;

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

      if (mode === 'tree') {
        // close the folder the cursor sits in, without scrolling back up to it
        if (input === '-') {
          const res = collapseParent(nodes, safeCursor, expanded);
          if (res) {
            setExpanded(res.expanded);
            setCursor(res.cursor);
          }
          return;
        }
      }

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
      <Text wrap="truncate-start">
        {t('menu.view')}: {archive}
      </Text>
      <Divider />
      <Box flexDirection="column">
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
        <EntryDetails
          path={focused?.id ?? ''}
          isDir={focused?.isDir ?? false}
          size={focused?.size ?? 0}
          modified={focusedEntry?.modified}
          modifiedText={focusedEntry?.modifiedText}
          childCount={focusedChildren}
          childCountLabel={
            focusedChildren === undefined
              ? undefined
              : t('view.detailChildren', { count: focusedChildren })
          }
          emptyLabel={t('view.detailEmpty')}
        />
      </Box>
      <Divider />
      {/* truncate rather than wrap: the chrome budget assumes a single line */}
      <Text dimColor wrap="truncate">
        {t(mode === 'tree' ? 'view.hintTree' : 'view.hintFlat')}
      </Text>
    </Box>
  );
};
