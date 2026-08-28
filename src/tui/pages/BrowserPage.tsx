import os from 'node:os';
import { Box, Text, useApp, useInput } from 'ink';
import type React from 'react';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { buildDefaultRegistry } from '../../engine/builder.js';
import { runCommand } from '../../engine/executor.js';
import {
  type ArchiveEntry,
  type BuiltCommand,
  FORMAT_EXTENSIONS,
  type FormatId,
} from '../../engine/types.js';
import { useAppStore } from '../../store/index.js';
import { type ActionId, availableActions } from '../browser/actions.js';
import { suggestArchiveName } from '../browser/defaults.js';
import { matchesKey } from '../browser/keymap.js';
import {
  archiveRows,
  type BrowserRow,
  firstContentIndex,
  fsRows,
  PARENT_ID,
  sortRows,
} from '../browser/listing.js';
import {
  archiveLocation,
  enterArchive,
  enterDir,
  fsLocation,
  goUp,
  isFsRoot,
  type Location,
  locationLabel,
} from '../browser/location.js';
import {
  count,
  EMPTY_DOMAINS,
  forLocation,
  paths,
  remove,
  resetArchiveDomain,
  setDomain,
  toggle,
  totalSize,
} from '../browser/selection.js';
import { ActionPanel } from '../components/ActionPanel.js';
import { AddressBar } from '../components/AddressBar.js';
import {
  type ArchiveListing,
  allDirPaths,
  buildArchiveTree,
  flattenTree,
  formatSize,
  initialExpanded,
  loadArchiveListing,
  type SortBy,
} from '../components/archiveTree.js';
import { Divider } from '../components/Divider.js';
import { EntryDetails } from '../components/EntryDetails.js';
import { fitPageSize } from '../components/fitPageSize.js';
import { HELP_ENTRIES, HelpPanel } from '../components/HelpPanel.js';
import { SelectionPopup } from '../components/SelectionPopup.js';
import { moveCursor, type ScrollAction } from '../components/scrollCursor.js';
import { listDirectoryAsNodes } from '../components/useDirectoryTree.js';
import { VirtualTree } from '../components/VirtualTree.js';
import { useT } from '../hooks/useI18n.js';
import { useTerminalRows } from '../hooks/useTerminalRows.js';

// rows spent on things that are not list entries: the app's padding (2), the
// address bar (1), the rule under it (1), the item count (1), the gap plus the
// two-line detail bar (3), the rule above the hint (1), and the hint (1)
export const CHROME_ROWS = 10;

// what the action panel spends on things that are not the command preview:
// the border (2), the title (1), three fields (3), a warning and an error line
// (2), the gap the preview's own border adds (1), and the control hint (1).
// The preview is clipped to whatever is left, because the control hint is what
// would otherwise fall off a short terminal — and a panel with no visible way
// out traps the user.
const PANEL_CHROME = 10;

type Overlay = 'none' | 'selection' | 'help' | 'compress';

export interface BrowserPageProps {
  /** Where to open; defaults to the working directory. */
  initialDir?: string;
  /** Open straight inside this archive instead, for `zt l <archive>`. */
  initialArchive?: string;
}

export const BrowserPage: React.FC<BrowserPageProps> = ({ initialDir, initialArchive }) => {
  const t = useT();
  const setRoute = useAppStore((s) => s.setRoute);
  const { exit } = useApp();
  const rows = useTerminalRows();

  const [location, setLocation] = useState<Location>(() =>
    initialArchive ? archiveLocation(initialArchive, '') : fsLocation(initialDir ?? process.cwd()),
  );
  const [cursor, setCursor] = useState(0);
  const [domains, setDomains] = useState(EMPTY_DOMAINS);
  const [showHidden, setShowHidden] = useState(false);
  const [treeView, setTreeView] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('default');
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [listing, setListing] = useState<ArchiveListing | null>(null);
  const [overlay, setOverlay] = useState<Overlay>('none');
  const [overlayCursor, setOverlayCursor] = useState(0);
  const [format, setFormat] = useState<FormatId>('7z');
  const [level, setLevel] = useState(6);
  const [output, setOutput] = useState('');
  const [panelField, setPanelField] = useState(0);
  /** Row to land on once the listing for a new location has rendered. */
  const [pendingFocus, setPendingFocus] = useState<string | null>(null);
  /** Location the cursor has already been placed for. */
  const [placedFor, setPlacedFor] = useState<string | null>(null);

  const selection = forLocation(domains, location.kind);
  const pageSize = fitPageSize(rows, CHROME_ROWS);
  const locationKey = locationLabel(location);

  // C3: the sort is threaded into the tree itself, so the tree overview and the
  // per-directory view agree. Toggling the view must not silently reorder.
  const tree = useMemo(
    () => (listing?.ok ? buildArchiveTree(listing.entries, sortBy) : []),
    [listing, sortBy],
  );

  const nodes = useMemo<readonly BrowserRow[]>(() => {
    if (location.kind === 'fs') {
      let raw: ReturnType<typeof listDirectoryAsNodes>;
      try {
        raw = listDirectoryAsNodes(location.dir, { depth: 0, showHidden });
      } catch {
        // an unreadable directory shows as empty rather than crashing a render
        raw = [];
      }
      return sortRows(fsRows(raw, !isFsRoot(location.dir)), sortBy);
    }
    if (treeView) {
      return flattenTree(tree, expanded).map((n) => ({ ...n, isArchive: false }));
    }
    // C3: no sortRows here — the tree was already built in the chosen order
    return archiveRows(tree, location.innerDir, true);
  }, [location, showHidden, tree, treeView, expanded, sortBy]);

  const total = nodes.length;
  const safeCursor = Math.min(cursor, Math.max(0, total - 1));
  const focused = nodes[safeCursor];
  const onParentRow = focused?.id === PARENT_ID;

  useEffect(() => {
    if (pendingFocus === null) return;
    const idx = nodes.findIndex((n) => n.id === pendingFocus);
    setCursor(idx >= 0 ? idx : 0);
    setPendingFocus(null);
  }, [pendingFocus, nodes]);

  // never leave the cursor on `..` for a location it has not been placed on
  // yet: opening a directory with the cursor on its parent means the first
  // Enter steps back out of the place you just opened. `pendingFocus` still
  // wins when set, so stepping out still lands on the row you came from.
  //
  // A layout effect rather than a plain effect: it must settle before a test
  // (or a user) can act on the very first render, and Ink commits layout
  // effects synchronously — a regular effect would still show the parent row
  // selected for a tick after mount.
  useLayoutEffect(() => {
    if (placedFor === locationKey) return;
    setPlacedFor(locationKey);
    if (pendingFocus === null) setCursor(firstContentIndex(nodes));
  }, [locationKey, placedFor, pendingFocus, nodes]);

  const entryByPath = useMemo(() => {
    const map = new Map<string, ArchiveEntry>();
    for (const e of listing?.entries ?? []) {
      // zip reports directories with a trailing slash; the tree drops it
      map.set(e.path.replace(/\/+$/, ''), e);
    }
    return map;
  }, [listing]);

  // C2: the parent row's real action is stepping out, so it gets no cursor
  // context — offering "enter" for it would mislabel the hint line
  const actions = availableActions({
    location,
    cursor:
      focused && !onParentRow
        ? { id: focused.id, isDir: focused.isDir, isArchive: focused.isArchive }
        : null,
    selectionCount: count(selection),
  });

  const openArchive = async (archivePath: string): Promise<void> => {
    setLocation(enterArchive(archivePath));
    setDomains((d) => resetArchiveDomain(d));
    setCursor(firstContentIndex(nodes));
    setListing(null);
    setTreeView(false);
    const result = await loadArchiveListing(archivePath, buildDefaultRegistry(), runCommand);
    setListing(result);
    setExpanded(initialExpanded(buildArchiveTree(result.entries, sortBy)));
  };

  const stepOut = (): void => {
    const res = goUp(location);
    if (!res) return;
    if (location.kind === 'archive' && res.location.kind === 'fs') {
      setDomains((d) => resetArchiveDomain(d));
      setListing(null);
      setTreeView(false);
    }
    setLocation(res.location);
    setPendingFocus(res.focusId);
  };

  const jumpTo = (target: string): void => {
    setLocation(fsLocation(target));
    setListing(null);
    setCursor(firstContentIndex(nodes));
  };

  /** C1: contextual actions are dispatched by id, never re-derived from flags. */
  const dispatch = (id: ActionId): void => {
    switch (id) {
      case 'enter':
        if (!focused) return;
        if (focused.isArchive) {
          void openArchive(focused.id);
          return;
        }
        if (focused.isDir) {
          setLocation(enterDir(location, focused.id));
          setCursor(firstContentIndex(nodes));
        }
        return;
      case 'leave':
        stepOut();
        return;
      case 'compress': {
        // availableActions only offers this on the filesystem with something
        // marked, but the location narrowing has to be re-stated for the type
        if (location.kind !== 'fs') return;
        setOutput(`${location.dir}/${suggestArchiveName(selection.items, location.dir, format)}`);
        setPanelField(0);
        setOverlay('compress');
        return;
      }
      case 'extract':
      case 'test':
        // wired in Task 14; the binding is proven here
        return;
      default:
        return;
    }
  };

  useInput(
    (input, key) => {
      if (key.escape) {
        setOverlay('none');
        return;
      }
      if (overlay === 'compress') {
        if (key.tab) {
          setPanelField((f) => (f + 1) % 3);
          return;
        }
        if (panelField === 0 && (key.leftArrow || key.rightArrow)) {
          const all = Object.keys(FORMAT_EXTENSIONS) as FormatId[];
          const at = all.indexOf(format);
          const next = all[(at + (key.rightArrow ? 1 : all.length - 1)) % all.length];
          if (next && location.kind === 'fs') {
            setFormat(next);
            // the extension is part of the name, so it follows the format
            setOutput(`${location.dir}/${suggestArchiveName(selection.items, location.dir, next)}`);
          }
          return;
        }
        if (panelField === 1 && (key.leftArrow || key.rightArrow)) {
          const levels = [1, 3, 6, 9];
          const at = levels.indexOf(level);
          const next = levels[(at + (key.rightArrow ? 1 : levels.length - 1)) % levels.length];
          if (next !== undefined) setLevel(next);
          return;
        }
        if (panelField === 2) {
          // typing straight into the field: the value truncates from the left,
          // so what you are typing stays on screen without a cursor to track
          if (key.backspace || key.delete) {
            setOutput((o) => o.slice(0, -1));
            return;
          }
          if (input !== '' && !key.ctrl && !key.meta) setOutput((o) => o + input);
          return;
        }
        return;
      }
      if (overlay === 'help') {
        if (key.leftArrow) setOverlayCursor((c) => Math.max(0, c - 1));
        if (key.rightArrow) setOverlayCursor((c) => Math.min(HELP_ENTRIES.length - 1, c + 1));
        if (key.return) {
          const entry = HELP_ENTRIES[overlayCursor];
          if (entry) setRoute(entry === 'deps' ? 'deps' : 'settings');
          setOverlay('none');
        }
        return;
      }
      if (key.upArrow) setOverlayCursor((c) => Math.max(0, c - 1));
      if (key.downArrow) {
        setOverlayCursor((c) => Math.min(Math.max(0, selection.items.length - 1), c + 1));
      }
      if (input === 'd') {
        const target = selection.items[overlayCursor];
        if (!target) return;
        setDomains((d) => setDomain(d, location.kind, remove(selection, target.path)));
        setOverlayCursor((c) => Math.max(0, c - 1));
      }
    },
    { isActive: overlay !== 'none' },
  );

  useInput(
    (input, key) => {
      // C1: the action list owns the contextual bindings
      const hit = actions.find((a) => matchesKey(a.key, input, key));
      if (hit) {
        dispatch(hit.id);
        return;
      }

      // C2: the parent row is navigation, not a contextual action
      if (onParentRow && (key.return || key.rightArrow || key.leftArrow)) {
        stepOut();
        return;
      }
      // stepping up on the filesystem is plain navigation
      if (key.leftArrow) {
        stepOut();
        return;
      }

      if (input === '?') {
        setOverlay('help');
        setOverlayCursor(0);
        return;
      }
      if (input === 'm') {
        setOverlay('selection');
        setOverlayCursor(0);
        return;
      }
      if (input === 'q') {
        exit();
        return;
      }
      if (input === ' ') {
        if (!focused || onParentRow) return;
        const next = toggle(selection, {
          path: focused.id,
          isDir: focused.isDir,
          size: focused.size,
        });
        setDomains((d) => setDomain(d, location.kind, next));
        return;
      }
      if (input === 's') {
        // rows land in a different order, so old row numbers mean nothing
        setSortBy((s) => (s === 'default' ? 'size' : 'default'));
        setCursor(firstContentIndex(nodes));
        return;
      }
      if (input === 'h' && location.kind === 'fs') {
        setShowHidden((v) => !v);
        setCursor(firstContentIndex(nodes));
        return;
      }
      if (input === '~' && location.kind === 'fs') {
        jumpTo(os.homedir());
        return;
      }
      if (input === '.' && location.kind === 'fs') {
        jumpTo(process.cwd());
        return;
      }
      if (location.kind === 'archive') {
        if (input === 'v') {
          setTreeView((v) => !v);
          setCursor(firstContentIndex(nodes));
          return;
        }
        if (treeView && input === 'e') {
          setExpanded(allDirPaths(tree));
          return;
        }
        if (treeView && input === 'c') {
          setExpanded(new Set());
          setCursor(firstContentIndex(nodes));
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
    { isActive: overlay === 'none' },
  );

  if (overlay === 'help') return <HelpPanel cursor={overlayCursor} />;
  if (overlay === 'selection') {
    // C4: a byte total is meaningless once a directory is marked, because the
    // filesystem listing does not walk them
    const dirs = selection.items.filter((i) => i.isDir).length;
    const title =
      dirs > 0
        ? t('browser.selectionTitleDirs', { count: count(selection), dirs })
        : t('browser.selectionTitle', {
            count: count(selection),
            size: formatSize(totalSize(selection)),
          });
    return (
      <SelectionPopup
        items={selection.items}
        cursor={overlayCursor}
        pageSize={pageSize}
        title={title}
        hint={`d ${t('common.cancel')} · ${t('help.close')}`}
        emptyLabel={t('browser.selectionEmpty')}
      />
    );
  }

  if (overlay === 'compress') {
    // gz and bz2 reject anything but a single input, and they do it by
    // throwing. Building the command inside the render body means that throw
    // would take the whole TUI down, so the failure is caught and shown in the
    // panel's own error slot instead. The adapter's wording is passed through
    // verbatim, the same way tool stderr is.
    let command: BuiltCommand = { cmd: '', args: [] };
    let buildError: string | undefined;
    try {
      command = buildDefaultRegistry()
        .get(format)
        .buildCreate({
          archive: output,
          inputs: paths(selection),
          level,
        });
    } catch (e) {
      buildError = e instanceof Error ? e.message : String(e);
    }
    return (
      <ActionPanel
        kind="compress"
        title={t('action.compressTitle', { count: count(selection) })}
        format={format}
        level={level}
        output={output}
        focusField={panelField}
        command={command}
        previewRows={Math.max(2, rows - PANEL_CHROME)}
        error={buildError}
      />
    );
  }

  const hintKey =
    location.kind === 'fs'
      ? 'browser.hintFs'
      : treeView
        ? 'browser.hintTree'
        : 'browser.hintArchive';

  const marked = count(selection);
  const focusedEntry = focused ? entryByPath.get(focused.id) : undefined;

  const hintParts = [
    onParentRow ? t('browser.parentHint') : '',
    actions.map((a) => `${a.key} ${t(a.labelKey, { count: a.labelCount ?? 0 })}`).join(' · '),
    t(hintKey),
  ].filter((s) => s !== '');

  return (
    <Box flexDirection="column">
      <AddressBar
        kind={location.kind}
        label={locationLabel(location)}
        countLabel={marked > 0 ? t('browser.selectedCount', { count: marked }) : undefined}
      />
      <Divider />
      <Box flexDirection="column">
        {location.kind === 'archive' && listing === null ? (
          <Text dimColor>{t('browser.loading')}</Text>
        ) : location.kind === 'archive' && listing && !listing.ok ? (
          <Text color="red">
            {t('browser.failed')}: {listing.error}
          </Text>
        ) : total === 0 ? (
          <Text dimColor>{t('browser.empty')}</Text>
        ) : (
          <VirtualTree
            nodes={nodes}
            pageSize={pageSize}
            selectedIndex={safeCursor}
            showSize
            showDirMarker={false}
            showExpandMarker={treeView}
            selectedIds={selection.ids}
            parentId={PARENT_ID}
            countLabel={t('browser.itemCount', { total, shown: Math.min(pageSize, total) })}
          />
        )}
      </Box>
      <Box marginTop={1}>
        <EntryDetails
          path={focused && !onParentRow ? focused.id : ''}
          isDir={focused?.isDir ?? false}
          size={focused?.size ?? 0}
          modified={focusedEntry?.modified}
          modifiedText={focusedEntry?.modifiedText}
          linkTarget={focusedEntry?.linkTarget}
          emptyLabel={t('browser.detailEmpty')}
        />
      </Box>
      <Divider />
      <Text dimColor wrap="truncate">
        {hintParts.join(' · ')}
      </Text>
    </Box>
  );
};
