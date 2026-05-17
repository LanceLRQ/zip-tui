import { Box, Text } from 'ink';
import type React from 'react';

export interface Hint {
  key: string;
  label: string;
}

export const StatusBar: React.FC<{ hints: Hint[] }> = ({ hints }) => (
  <Box borderStyle="single" borderTop borderBottom={false} borderLeft={false} borderRight={false}>
    {hints.map((h) => (
      <Box key={`${h.key}:${h.label}`} marginRight={2}>
        <Text color="cyan">{h.key}</Text>
        <Text> </Text>
        <Text>{h.label}</Text>
      </Box>
    ))}
  </Box>
);
