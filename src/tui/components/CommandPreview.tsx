import { Box, Text } from 'ink';
import type React from 'react';
import { renderDryRun } from '../../engine/executor.js';
import type { BuiltCommand } from '../../engine/types.js';

export const CommandPreview: React.FC<{ command: BuiltCommand }> = ({ command }) => (
  <Box flexDirection="column" borderStyle="round" paddingX={1}>
    <Text color="green">$ {renderDryRun(command)}</Text>
  </Box>
);
