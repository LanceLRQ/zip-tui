import { Box, Text } from 'ink';
import type React from 'react';
import type { SelectionItem } from '../browser/selection.js';
import { SelectedList } from './SelectedList.js';

export interface SelectionPopupProps {
  items: readonly SelectionItem[];
  cursor: number;
  pageSize: number;
  /** Pre-formatted header; the page decides whether a size is meaningful. */
  title: string;
  hint: string;
  emptyLabel?: string | undefined;
}

/**
 * The marked rows, on demand.
 *
 * Marks made in one directory stop being visible once you navigate away, so
 * this is the only place a cross-directory selection can be reviewed and
 * unpicked. It is a popup rather than a permanent pane because the common case
 * — a couple of rows marked in the directory you are looking at — needs no
 * help, and a pane would halve the list width to serve the rare case.
 *
 * The header arrives pre-formatted. Directory sizes are not known (the
 * filesystem listing does not walk them), so whether a total is honest depends
 * on what is marked, and that judgement belongs to the page.
 */
export const SelectionPopup: React.FC<SelectionPopupProps> = ({
  items,
  cursor,
  pageSize,
  title,
  hint,
  emptyLabel,
}) => (
  <Box flexDirection="column" borderStyle="round" paddingX={1}>
    <Text bold>{title}</Text>
    {items.length === 0 ? (
      <Text dimColor>{emptyLabel ?? ''}</Text>
    ) : (
      <SelectedList items={items} cursor={cursor} pageSize={pageSize} focused />
    )}
    <Text dimColor wrap="truncate">
      {hint}
    </Text>
  </Box>
);
