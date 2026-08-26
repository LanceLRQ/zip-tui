import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useT } from '../hooks/useI18n.js';
import { useTerminalRows } from '../hooks/useTerminalRows.js';
import { fitPageSize } from './fitPageSize.js';
import { type SelectedItem, SelectedList } from './SelectedList.js';
import { listDirectoryAsNodes } from './useDirectoryTree.js';
import { type TreeNode, VirtualTree } from './VirtualTree.js';

export type PickerMode = 'openFile' | 'openDir' | 'saveFile' | 'multiSelect';

interface FilePickerCommonProps {
  initialPath?: string;
  preselectPath?: string;
  filterExtensions?: string[];
  showHidden?: boolean;
  defaultFilename?: string;
  onCancel: () => void;
}

export type FilePickerProps =
  | (FilePickerCommonProps & {
      mode: 'openFile' | 'openDir' | 'saveFile';
      onConfirm: (path: string) => void;
    })
  | (FilePickerCommonProps & {
      mode: 'multiSelect';
      onConfirm: (paths: string[]) => void;
    });

const PARENT_ID = '__parent__';

/**
 * Rows each mode spends on things that are not list entries, so the list can
 * claim whatever is left of the terminal.
 *
 * Common to every mode: the app's padding (2), the caller's own heading (1),
 * this dialog's rounded border (2), the title row (1), the cwd row (1), a row
 * held back for an error message (1), and the hint line (1) — nine in total.
 * On top of that the single-pane modes add the list's top and bottom rules (2)
 * plus the item count (1); saveFile adds its filename row; and multiSelect's
 * boxed panes add a border (2), a pane title (1) and the item count (1).
 */
const CHROME_ROWS: Record<PickerMode, number> = {
  openFile: 12,
  openDir: 12,
  saveFile: 13,
  multiSelect: 13,
};

const TITLE_KEYS: Record<PickerMode, string> = {
  openFile: 'picker.openFile',
  openDir: 'picker.openDir',
  saveFile: 'picker.saveFile',
  multiSelect: 'picker.multiSelect',
};

function matchesAnyExt(name: string, lowerExts: string[]): boolean {
  const lower = name.toLowerCase();
  return lowerExts.some((e) => lower.endsWith(e));
}

function isRoot(dir: string): boolean {
  return path.parse(dir).root === dir;
}

export const FilePicker: React.FC<FilePickerProps> = (props) => {
  const {
    mode,
    initialPath,
    preselectPath,
    filterExtensions,
    showHidden: initialShowHidden = false,
    defaultFilename = 'archive.7z',
    onCancel,
  } = props;
  const t = useT();
  const rows = useTerminalRows();
  const pageSize = fitPageSize(rows, CHROME_ROWS[mode]);
  const [cwd, setCwd] = useState(
    preselectPath ? path.dirname(preselectPath) : (initialPath ?? process.cwd()),
  );
  const [cursor, setCursor] = useState(0);
  // selected: O(1) checkbox lookup for VirtualTree; selectedItems: insertion-ordered render source
  const [selected, setSelected] = useState<Set<string>>(() => {
    if (mode === 'multiSelect' && preselectPath) {
      try {
        fs.statSync(preselectPath);
        return new Set([preselectPath]);
      } catch {
        // path does not exist → start empty
      }
    }
    return new Set();
  });
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>(() => {
    if (mode === 'multiSelect' && preselectPath) {
      try {
        const isDir = fs.statSync(preselectPath).isDirectory();
        return [{ path: preselectPath, isDir }];
      } catch {
        // path does not exist → start empty
      }
    }
    return [];
  });
  const [paneFocus, setPaneFocus] = useState<'browse' | 'selected'>('browse');
  const [selectedCursor, setSelectedCursor] = useState(0);
  const [filename, setFilename] = useState(mode === 'saveFile' ? defaultFilename : '');
  const [focus, setFocus] = useState<'list' | 'filename'>(
    mode === 'saveFile' ? 'filename' : 'list',
  );
  const [showHidden, setShowHidden] = useState(initialShowHidden);
  const [filterEnabled, setFilterEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const lowerExts = useMemo(
    () => (filterExtensions ?? []).map((e) => e.toLowerCase()),
    [filterExtensions],
  );

  const items = useMemo<TreeNode[]>(() => {
    let raw: TreeNode[];
    try {
      raw = listDirectoryAsNodes(cwd, { depth: 0, showHidden });
    } catch {
      raw = [];
    }
    if ((mode === 'openFile' || mode === 'saveFile') && filterEnabled && lowerExts.length > 0) {
      raw = raw.filter((n) => n.isDir || matchesAnyExt(n.label, lowerExts));
    }
    if (mode === 'openDir') {
      raw = raw.filter((n) => n.isDir);
    }
    if (!isRoot(cwd)) {
      return [{ id: PARENT_ID, label: '..', isDir: true, size: 0, depth: 0 }, ...raw];
    }
    return raw;
  }, [cwd, showHidden, filterEnabled, mode, lowerExts]);

  useEffect(() => {
    setCursor((c) => Math.min(c, Math.max(0, items.length - 1)));
  }, [items.length]);

  const jumpTo = (newCwd: string): void => {
    setCwd(newCwd);
    setCursor(0);
    setError(null);
  };

  const enterNode = (node: TreeNode): void => {
    if (node.id === PARENT_ID) {
      jumpTo(path.dirname(cwd));
      return;
    }
    if (node.isDir) {
      jumpTo(node.id);
      return;
    }
    if (props.mode === 'openFile') {
      props.onConfirm(node.id);
    }
  };

  const confirmSaveFile = (): void => {
    if (props.mode !== 'saveFile') return;
    const trimmed = filename.trim();
    if (!trimmed) {
      setError(t('picker.errorEmptyFilename'));
      setFocus('filename');
      return;
    }
    props.onConfirm(path.join(cwd, trimmed));
  };

  useInput(
    (input, key) => {
      if (key.escape) {
        onCancel();
        return;
      }
      if (key.tab) {
        if (mode === 'saveFile') {
          setFocus('filename');
          return;
        }
        if (mode === 'multiSelect') {
          setPaneFocus('selected');
          return;
        }
      }
      if (key.upArrow) {
        setCursor((c) => Math.max(0, c - 1));
        return;
      }
      if (key.downArrow) {
        setCursor((c) => Math.min(Math.max(0, items.length - 1), c + 1));
        return;
      }
      if (key.return) {
        const node = items[cursor];
        if (node) enterNode(node);
        return;
      }
      if (key.rightArrow) {
        const node = items[cursor];
        if (node) enterNode(node);
        return;
      }
      if (key.leftArrow || key.backspace) {
        if (!isRoot(cwd)) jumpTo(path.dirname(cwd));
        return;
      }
      if (input === ' ') {
        const node = items[cursor];
        if (!node || node.id === PARENT_ID) return;
        if (props.mode === 'openDir') {
          if (node.isDir) props.onConfirm(node.id);
          return;
        }
        if (props.mode === 'openFile') {
          if (!node.isDir) props.onConfirm(node.id);
          return;
        }
        if (mode === 'multiSelect') {
          const id = node.id;
          const exists = selectedItems.some((it) => it.path === id);
          setSelected((s) => {
            const n = new Set(s);
            if (n.has(id)) n.delete(id);
            else n.add(id);
            return n;
          });
          setSelectedItems((arr) =>
            exists ? arr.filter((it) => it.path !== id) : [...arr, { path: id, isDir: node.isDir }],
          );
          if (!exists && error) setError(null);
          return;
        }
        return;
      }
      if (input === '~') {
        jumpTo(os.homedir());
        return;
      }
      if (input === '.') {
        jumpTo(process.cwd());
        return;
      }
      if (input === 'h') {
        setShowHidden((v) => !v);
        setCursor(0);
        return;
      }
      if (input === '*' && (mode === 'openFile' || mode === 'saveFile')) {
        setFilterEnabled((v) => !v);
        setCursor(0);
        return;
      }
    },
    { isActive: focus === 'list' && !(mode === 'multiSelect' && paneFocus === 'selected') },
  );

  useInput(
    (input, key) => {
      if (key.escape) {
        onCancel();
        return;
      }
      if (key.tab) {
        setPaneFocus('browse');
        if (error) setError(null);
        return;
      }
      if (key.upArrow) {
        setSelectedCursor((c) => Math.max(0, c - 1));
        return;
      }
      if (key.downArrow) {
        setSelectedCursor((c) => Math.min(Math.max(0, selectedItems.length - 1), c + 1));
        return;
      }
      if (key.return) {
        if (selectedItems.length === 0) {
          setError(t('picker.errorEmptySelection'));
          return;
        }
        if (props.mode === 'multiSelect') props.onConfirm(selectedItems.map((it) => it.path));
        return;
      }
      if (input === ' ' || input === 'd' || key.backspace) {
        const target = selectedItems[selectedCursor];
        if (!target) return;
        setSelected((s) => {
          const n = new Set(s);
          n.delete(target.path);
          return n;
        });
        setSelectedItems((arr) => arr.filter((_, i) => i !== selectedCursor));
        setSelectedCursor((c) => Math.max(0, Math.min(c, selectedItems.length - 2)));
        return;
      }
    },
    { isActive: mode === 'multiSelect' && paneFocus === 'selected' },
  );

  useInput(
    (_input, key) => {
      if (key.escape) {
        onCancel();
        return;
      }
      if (key.tab) {
        setFocus('list');
        return;
      }
    },
    { isActive: mode === 'saveFile' && focus === 'filename' },
  );

  const handleFilenameChange = (v: string): void => {
    setFilename(v);
    if (error) setError(null);
  };

  const filterVisible =
    (mode === 'openFile' || mode === 'saveFile') &&
    filterExtensions !== undefined &&
    filterExtensions.length > 0;

  const FILTER_PREVIEW_CAP = 3;
  const filterText = ((): string => {
    if (!filterVisible) return '';
    if (!filterEnabled) return `[${t('picker.filterOff')}]`;
    const all = filterExtensions ?? [];
    if (all.length <= FILTER_PREVIEW_CAP) {
      return `[${t('picker.filterOn')}] ${all.join(' ')}`;
    }
    const head = all.slice(0, FILTER_PREVIEW_CAP).join(' ');
    const rest = all.length - FILTER_PREVIEW_CAP;
    return `[${t('picker.filterOn')}] ${head} +${rest}`;
  })();

  const hintKey =
    mode === 'multiSelect'
      ? paneFocus === 'selected'
        ? 'picker.hintSelected'
        : 'picker.hintMulti'
      : mode === 'saveFile'
        ? 'picker.hintSave'
        : 'picker.hintBrowse';

  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1}>
      <Box justifyContent="space-between">
        <Text bold>{t(TITLE_KEYS[mode])}</Text>
      </Box>
      <Box justifyContent="space-between">
        <Box flexShrink={1}>
          <Text dimColor wrap="truncate">
            📂 {cwd}
          </Text>
        </Box>
        {filterVisible && mode === 'openFile' && (
          <Box flexShrink={0} marginLeft={2}>
            <Text dimColor>{filterText}</Text>
          </Box>
        )}
      </Box>
      {mode === 'saveFile' && (
        <Box justifyContent="space-between">
          <Box flexShrink={1}>
            <Text {...(focus === 'filename' ? { color: 'cyan', bold: true } : { dimColor: true })}>
              {focus === 'filename' ? '▸ ' : '  '}
              {t('picker.filename')}:{' '}
            </Text>
            <TextInput
              value={filename}
              onChange={handleFilenameChange}
              onSubmit={confirmSaveFile}
              focus={focus === 'filename'}
            />
          </Box>
          {filterVisible && (
            <Box flexShrink={0} marginLeft={2}>
              <Text dimColor>{filterText}</Text>
            </Box>
          )}
        </Box>
      )}
      {mode === 'saveFile' && error && <Text color="red">{error}</Text>}
      {mode === 'multiSelect' ? (
        <Box flexDirection="row">
          <Box
            flexDirection="column"
            flexGrow={1}
            borderStyle="single"
            borderColor={paneFocus === 'browse' ? 'cyan' : undefined}
          >
            <Text bold>{t('picker.browseTitle')}</Text>
            <VirtualTree
              nodes={items}
              pageSize={pageSize}
              selectedIndex={cursor}
              countLabel={t('picker.itemCount', {
                total: items.length,
                shown: Math.min(pageSize, items.length),
              })}
              selectedIds={selected}
              parentId={PARENT_ID}
            />
          </Box>
          <Box
            flexDirection="column"
            flexGrow={1}
            marginLeft={1}
            borderStyle="single"
            borderColor={paneFocus === 'selected' ? 'cyan' : undefined}
          >
            <Text bold>{t('picker.selectedTitle', { count: selectedItems.length })}</Text>
            {selectedItems.length === 0 ? (
              <Text dimColor>{t('picker.selectedEmpty')}</Text>
            ) : (
              <SelectedList
                items={selectedItems}
                cursor={selectedCursor}
                pageSize={pageSize}
                focused={paneFocus === 'selected'}
              />
            )}
          </Box>
        </Box>
      ) : (
        <Box
          flexDirection="column"
          borderStyle="single"
          borderLeft={false}
          borderRight={false}
          borderColor={mode === 'saveFile' && focus === 'list' ? 'cyan' : undefined}
        >
          <VirtualTree
            nodes={items}
            pageSize={pageSize}
            selectedIndex={cursor}
            countLabel={t('picker.itemCount', {
              total: items.length,
              shown: Math.min(pageSize, items.length),
            })}
            parentId={PARENT_ID}
          />
        </Box>
      )}
      {mode !== 'saveFile' && error && <Text color="red">{error}</Text>}
      <Text dimColor>{t(hintKey)}</Text>
    </Box>
  );
};
