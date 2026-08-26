import { Box } from 'ink';
import type React from 'react';

/**
 * Full-width horizontal rule.
 *
 * An empty box with only a top border stretches to the container's width, so
 * the line spans the terminal without needing to know how wide it is.
 * Occupies one row — callers that budget rows must account for it.
 */
export const Divider: React.FC = () => (
  <Box borderStyle="single" borderTop borderBottom={false} borderLeft={false} borderRight={false} />
);
