import { Box, Text } from 'ink';
import type React from 'react';
// archiveTree imports TreeNode from here as a type only, so this stays a
// one-way dependency at runtime
import { formatSize } from './archiveTree.js';

export interface TreeNode {
  id: string;
  label: string;
  isDir: boolean;
  size: number;
  depth?: number;
  expanded?: boolean;
  /** Pre-formatted size text; falls back to the raw byte count when absent. */
  sizeLabel?: string;
}

export interface VirtualTreeProps {
  nodes: TreeNode[];
  pageSize: number;
  selectedIndex: number;
  selectedIds?: Set<string>;
  parentId?: string;
  onToggle?: (id: string) => void;
  countLabel?: string;
  showSize?: boolean;
  showDirMarker?: boolean;
}

// trailing marker on directory rows: a right arrow signalling the row can be opened
const DIR_MARKER = ' →';
// blank stand-in for the checkbox column so the parent row's label stays aligned
const CHECKBOX_GAP = '    ';
// widest value the size column has to hold is "1024.0 G"
const SIZE_WIDTH = 8;

export const VirtualTree: React.FC<VirtualTreeProps> = ({
  nodes,
  pageSize,
  selectedIndex,
  selectedIds,
  parentId,
  countLabel,
  showSize = false,
  showDirMarker = true,
}) => {
  const half = Math.floor(pageSize / 2);
  let start = Math.max(0, selectedIndex - half);
  const end = Math.min(nodes.length, start + pageSize);
  if (end - start < pageSize) start = Math.max(0, end - pageSize);

  const visible = nodes.slice(start, end);
  const showCheckbox = selectedIds !== undefined;

  return (
    <Box flexDirection="column">
      <Text dimColor>{countLabel ?? `${nodes.length} items, showing ${visible.length}`}</Text>
      {visible.map((n, idx) => {
        const absoluteIdx = start + idx;
        const isCursor = absoluteIdx === selectedIndex;
        const isParent = parentId !== undefined && n.id === parentId;
        const isChecked = selectedIds?.has(n.id) ?? false;
        const indent = '  '.repeat(n.depth ?? 0);
        const checkbox = showCheckbox
          ? isParent
            ? CHECKBOX_GAP
            : `[${isChecked ? 'x' : ' '}] `
          : '';
        const sizeCol = showSize
          ? `${(n.sizeLabel ?? formatSize(n.size)).padStart(SIZE_WIDTH)}  `
          : '';
        return (
          <Box key={n.id}>
            <Text {...(isCursor ? { color: 'cyan' } : {})}>
              {isCursor ? '▶ ' : '  '}
              {checkbox}
            </Text>
            {showSize ? <Text dimColor={!isCursor}>{sizeCol}</Text> : null}
            <Text {...(isCursor ? { color: 'cyan' } : {})}>{indent}</Text>
            <Text {...(isCursor ? { color: 'cyan' } : {})} bold={n.isDir}>
              {n.label}
              {n.isDir && !isParent && showDirMarker ? DIR_MARKER : ''}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
};
