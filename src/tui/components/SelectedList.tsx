import { Box, Text } from 'ink';
import type React from 'react';

export interface SelectedItem {
  path: string;
  isDir: boolean;
}

export interface SelectedListProps {
  items: SelectedItem[];
  cursor: number;
  pageSize: number;
  focused: boolean;
}

const TAG_DIR = '[D] ';
const TAG_FILE = '[F] ';

export const SelectedList: React.FC<SelectedListProps> = ({ items, cursor, pageSize, focused }) => {
  const half = Math.floor(pageSize / 2);
  let start = Math.max(0, cursor - half);
  const end = Math.min(items.length, start + pageSize);
  if (end - start < pageSize) start = Math.max(0, end - pageSize);
  const visible = items.slice(start, end);

  return (
    <Box flexDirection="column">
      {visible.map((it, idx) => {
        const absolute = start + idx;
        const isCursor = focused && absolute === cursor;
        const tag = it.isDir ? TAG_DIR : TAG_FILE;
        return (
          <Box key={it.path}>
            <Text {...(isCursor ? { color: 'cyan' } : {})} wrap="wrap">
              {tag}
              {it.path}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
};
