import { Box, Text } from 'ink';
import type React from 'react';

export interface ModalProps {
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ title, children }) => (
  <Box flexDirection="column" borderStyle="double" paddingX={1} paddingY={0}>
    <Text color="yellow" bold>
      {title}
    </Text>
    <Box marginTop={1} flexDirection="column">
      {children}
    </Box>
  </Box>
);
