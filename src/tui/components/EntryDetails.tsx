import { Box, Text } from 'ink';
import type React from 'react';
import { displayTimestamp } from '../../engine/adapters/dateUtils.js';
import { formatSize } from './archiveTree.js';

export interface EntryDetailsProps {
  /** Full path of the highlighted row; empty renders a placeholder. */
  path: string;
  isDir: boolean;
  size: number;
  modified?: Date | undefined;
  modifiedText?: string | undefined;
  /** Number of immediate children, for a directory. */
  childCount?: number | undefined;
  /** Localised "{{count}} items" label; omitted when childCount is absent. */
  childCountLabel?: string | undefined;
  /** Symlink target, when the tool reported one. */
  linkTarget?: string | undefined;
  emptyLabel: string;
}

/**
 * Detail bar for the highlighted row.
 *
 * The path gets its own line and truncates from the left, so the file name —
 * the part being looked for — stays visible however deep the entry sits.
 */
export const EntryDetails: React.FC<EntryDetailsProps> = ({
  path,
  isDir,
  size,
  modified,
  modifiedText,
  childCount,
  childCountLabel,
  linkTarget,
  emptyLabel,
}) => {
  if (path === '') {
    return (
      <Box>
        <Text dimColor>{emptyLabel}</Text>
      </Box>
    );
  }

  const stamp = displayTimestamp(modified, modifiedText);
  const parts: string[] = [];
  if (isDir && childCount !== undefined && childCountLabel) parts.push(childCountLabel);
  parts.push(formatSize(size));
  if (stamp) parts.push(stamp);

  return (
    <Box flexDirection="column">
      <Text wrap="truncate-start">
        <Text color="cyan">{path}</Text>
        {linkTarget ? <Text dimColor>{` → ${linkTarget}`}</Text> : null}
      </Text>
      <Text dimColor wrap="truncate">
        {parts.join(' · ')}
      </Text>
    </Box>
  );
};
