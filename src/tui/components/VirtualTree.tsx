import { Box, Text } from 'ink';
import type React from 'react';

export interface TreeNode {
  id: string;
  label: string;
  isDir: boolean;
  size: number;
  depth?: number;
  expanded?: boolean;
}

export interface VirtualTreeProps {
  nodes: TreeNode[];
  pageSize: number;
  selectedIndex: number;
  selectedIds?: Set<string>;
  onToggle?: (id: string) => void;
}

export const VirtualTree: React.FC<VirtualTreeProps> = ({
  nodes,
  pageSize,
  selectedIndex,
  selectedIds,
}) => {
  const half = Math.floor(pageSize / 2);
  let start = Math.max(0, selectedIndex - half);
  const end = Math.min(nodes.length, start + pageSize);
  if (end - start < pageSize) start = Math.max(0, end - pageSize);

  const visible = nodes.slice(start, end);
  const showCheckbox = selectedIds !== undefined;

  return (
    <Box flexDirection="column">
      <Text dimColor>
        ({nodes.length} items, showing {visible.length})
      </Text>
      {visible.map((n, idx) => {
        const absoluteIdx = start + idx;
        const isCursor = absoluteIdx === selectedIndex;
        const isChecked = selectedIds?.has(n.id) ?? false;
        const indent = '  '.repeat(n.depth ?? 0);
        return (
          <Box key={n.id}>
            <Text {...(isCursor ? { color: 'cyan' } : {})}>
              {isCursor ? '▶ ' : '  '}
              {showCheckbox ? `[${isChecked ? 'x' : ' '}] ` : ''}
              {indent}
              {n.isDir ? (n.expanded ? '▼ ' : '▶ ') : '  '}
              {n.label}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
};
