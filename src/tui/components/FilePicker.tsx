import os from 'node:os';
import path from 'node:path';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useT } from '../hooks/useI18n.js';
import { listDirectoryAsNodes } from './useDirectoryTree.js';
import { type TreeNode, VirtualTree } from './VirtualTree.js';

export type PickerMode = 'openFile' | 'openDir' | 'saveFile' | 'multiSelect';

interface FilePickerCommonProps {
  initialPath?: string;
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
    filterExtensions,
    showHidden: initialShowHidden = false,
    defaultFilename = 'archive.7z',
    onCancel,
  } = props;
  const t = useT();
  const [cwd, setCwd] = useState(initialPath ?? process.cwd());
  const [cursor, setCursor] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
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

  const confirmCurrentDir = (): void => {
    if (props.mode === 'openDir') props.onConfirm(cwd);
  };

  const confirmMulti = (): void => {
    if (props.mode === 'multiSelect') props.onConfirm([...selected]);
  };

  useInput(
    (input, key) => {
      if (key.escape) {
        onCancel();
        return;
      }
      if (key.tab && mode === 'saveFile') {
        setFocus('filename');
        return;
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
      if (input === ' ' && mode === 'multiSelect') {
        const node = items[cursor];
        if (node && node.id !== PARENT_ID) {
          setSelected((s) => {
            const n = new Set(s);
            if (n.has(node.id)) n.delete(node.id);
            else n.add(node.id);
            return n;
          });
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
      if (input === 'd') {
        if (mode === 'openDir') return confirmCurrentDir();
        if (mode === 'multiSelect') return confirmMulti();
        if (mode === 'saveFile') return confirmSaveFile();
      }
      if (input === 'a' && mode === 'multiSelect') {
        setSelected((s) => {
          const next = new Set(s);
          for (const n of items) {
            if (n.id !== PARENT_ID) next.add(n.id);
          }
          return next;
        });
        return;
      }
      if (input === 'c' && mode === 'multiSelect') {
        setSelected((s) => (s.size === 0 ? s : new Set()));
        return;
      }
    },
    { isActive: focus === 'list' },
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

  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1}>
      <Box justifyContent="space-between">
        <Text bold>{t(TITLE_KEYS[mode])}</Text>
        {mode === 'multiSelect' && <Text>{t('picker.selected', { count: selected.size })}</Text>}
      </Box>
      <Box justifyContent="space-between">
        <Box flexShrink={1}>
          <Text dimColor wrap="truncate-middle">
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
      <Box
        flexDirection="column"
        borderStyle="single"
        borderLeft={false}
        borderRight={false}
        marginY={0}
        {...(mode === 'saveFile' && focus === 'list' ? { borderColor: 'cyan' } : {})}
      >
        <VirtualTree
          nodes={items}
          pageSize={15}
          selectedIndex={cursor}
          {...(mode === 'multiSelect' ? { selectedIds: selected } : {})}
        />
      </Box>
      {mode !== 'saveFile' && error && <Text color="red">{error}</Text>}
      <Text dimColor>{t('picker.hint')}</Text>
    </Box>
  );
};
