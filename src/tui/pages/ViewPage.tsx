import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type React from 'react';
import { useState } from 'react';
import { buildDefaultRegistry } from '../../engine/builder.js';
import { runCommand } from '../../engine/executor.js';
import { resolveListCommand } from '../../runner/direct.js';
import { useAppStore } from '../../store/index.js';

export const ViewPage: React.FC = () => {
  const setRoute = useAppStore((s) => s.setRoute);
  const [archive, setArchive] = useState('');
  const [entries, setEntries] = useState<string[]>([]);

  useInput((_input, key) => {
    if (key.escape) setRoute('menu');
  });

  return (
    <Box flexDirection="column">
      <Text>view · archive path:</Text>
      <TextInput
        value={archive}
        onChange={setArchive}
        onSubmit={async (value) => {
          const r = buildDefaultRegistry();
          const cmd = resolveListCommand(r, value);
          const out = await runCommand(cmd);
          setEntries(out.stdout.split('\n').slice(0, 50));
        }}
      />
      <Box flexDirection="column" marginTop={1}>
        {entries.map((line) => (
          <Text key={line}>{line}</Text>
        ))}
      </Box>
    </Box>
  );
};
