import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import type React from 'react';

export interface GlobInputProps {
  value: string;
  onChange: (s: string) => void;
  onSubmit: (s: string) => void;
}

export const GlobInput: React.FC<GlobInputProps> = ({ value, onChange, onSubmit }) => (
  <Box>
    <Text color="cyan">glob: </Text>
    <TextInput value={value} onChange={onChange} onSubmit={onSubmit} />
  </Box>
);
