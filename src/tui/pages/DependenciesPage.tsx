import { Box, Text, useInput } from 'ink';
import type React from 'react';
import { useAppStore } from '../../store/index.js';

export const DependenciesPage: React.FC = () => {
  const status = useAppStore((s) => s.deps.status);
  const setRoute = useAppStore((s) => s.setRoute);
  useInput((_input, key) => {
    if (key.escape) setRoute('browser');
  });

  return (
    <Box flexDirection="column">
      <Text bold>Dependencies</Text>
      {status.map((s) => (
        <Text key={s.name}>
          {s.available ? '✓' : '✗'} {s.name} {s.version ? `(${s.version})` : ''}
        </Text>
      ))}
      <Box marginTop={1}>
        <Text dimColor>Esc to return</Text>
      </Box>
    </Box>
  );
};
