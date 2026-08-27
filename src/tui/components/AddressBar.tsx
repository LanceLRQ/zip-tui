import { Box, Text } from 'ink';
import type React from 'react';

export interface AddressBarProps {
  /**
   * Which kind of location this is.
   *
   * Spelled as a literal union rather than importing `Location`'s kind from
   * `browser/`, because this is a presentational component and the domain
   * modules already depend on `components/`.
   */
  kind: 'fs' | 'archive';
  /** Path text, as produced by `locationLabel`. */
  label: string;
  /** Localised "{{count}} marked"; omitted when nothing is marked. */
  countLabel?: string | undefined;
}

const ICON: Record<AddressBarProps['kind'], string> = { fs: '📂', archive: '📦' };

/**
 * Where the browser is, and how much is marked.
 *
 * The icon sits in its own box that never shrinks: it is the only signal for
 * whether you are on the filesystem or inside a package, so it has to outlive
 * the path. The path truncates from the left instead, keeping the deepest
 * segment — the part that says where you actually are.
 *
 * The count is pinned right and also never shrinks, because marks made in
 * directories that have scrolled away would otherwise be invisible.
 */
export const AddressBar: React.FC<AddressBarProps> = ({ kind, label, countLabel }) => (
  <Box justifyContent="space-between">
    <Box flexShrink={1}>
      <Box flexShrink={0}>
        <Text>{ICON[kind]} </Text>
      </Box>
      <Box flexShrink={1}>
        <Text wrap="truncate-start">{label}</Text>
      </Box>
    </Box>
    {countLabel ? (
      <Box flexShrink={0} marginLeft={2}>
        <Text color="cyan">[{countLabel}]</Text>
      </Box>
    ) : null}
  </Box>
);
