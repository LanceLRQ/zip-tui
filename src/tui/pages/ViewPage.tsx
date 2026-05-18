import { Box, Text, useInput } from 'ink';
import type React from 'react';
import { useState } from 'react';
import { buildDefaultRegistry } from '../../engine/builder.js';
import { runCommand } from '../../engine/executor.js';
import { MVP_ARCHIVE_EXTENSIONS } from '../../engine/types.js';
import { resolveListCommand } from '../../runner/direct.js';
import { useAppStore } from '../../store/index.js';
import { FilePicker } from '../components/FilePicker.js';
import { useT } from '../hooks/useI18n.js';

export const ViewPage: React.FC = () => {
  const t = useT();
  const setRoute = useAppStore((s) => s.setRoute);
  const [archive, setArchive] = useState('');
  const [entries, setEntries] = useState<string[]>([]);

  useInput(
    (_input, key) => {
      if (key.escape) setRoute('menu');
    },
    { isActive: archive !== '' },
  );

  if (archive === '') {
    return (
      <Box flexDirection="column">
        <Text>{t('menu.view')}</Text>
        <FilePicker
          mode="openFile"
          filterExtensions={[...MVP_ARCHIVE_EXTENSIONS]}
          onConfirm={async (p) => {
            setArchive(p);
            const r = buildDefaultRegistry();
            const cmd = resolveListCommand(r, p);
            const out = await runCommand(cmd);
            setEntries(out.stdout.split('\n').slice(0, 50));
          }}
          onCancel={() => setRoute('menu')}
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text>
        {t('menu.view')}: {archive}
      </Text>
      <Box flexDirection="column" marginTop={1}>
        {entries.map((line) => (
          <Text key={line}>{line}</Text>
        ))}
      </Box>
    </Box>
  );
};
