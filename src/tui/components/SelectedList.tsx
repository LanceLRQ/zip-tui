import { Box, Text } from 'ink';
import type React from 'react';

export interface SelectedItem {
  path: string;
  isDir: boolean;
}

export interface SelectedListProps {
  items: readonly SelectedItem[];
  cursor: number;
  pageSize: number;
  focused: boolean;
}

const TAG_DIR = '[D] ';
const TAG_FILE = '[F] ';
// mirrors VirtualTree: colour alone would vanish under NO_COLOR or a pipe
const CURSOR = '▶ ';
const CURSOR_GAP = '  ';

/**
 * Windowed list of selected items.
 *
 * Paths truncate from the left rather than wrapping. These are absolute paths
 * shown in a pane that may be half the terminal wide, and wrapping one across
 * three lines makes the list unreadable — the tail is the part that identifies
 * the entry, so that is what survives. Same reasoning as `EntryDetails`.
 */
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
            {/* marker and tag never shrink; the path truncates from left */}
            <Box flexShrink={0}>
              <Text {...(isCursor ? { color: 'cyan' } : {})}>
                {isCursor ? CURSOR : CURSOR_GAP}
                {tag}
              </Text>
            </Box>
            <Box flexShrink={1}>
              <Text {...(isCursor ? { color: 'cyan' } : {})} wrap="truncate-start">
                {it.path}
              </Text>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};
