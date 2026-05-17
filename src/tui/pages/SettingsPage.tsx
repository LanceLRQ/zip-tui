import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import type React from 'react';
import { getConfig } from '../../infra/config.js';
import { changeLanguage } from '../../infra/i18n.js';
import { useAppStore } from '../../store/index.js';

export const SettingsPage: React.FC = () => {
  const setRoute = useAppStore((s) => s.setRoute);
  const config = getConfig();

  useInput((_input, key) => {
    if (key.escape) setRoute('menu');
  });

  return (
    <Box flexDirection="column">
      <Text bold>Settings</Text>
      <Text>Language:</Text>
      <SelectInput
        items={[
          { label: '中文', value: 'zh' },
          { label: 'English', value: 'en' },
        ]}
        onSelect={async (it) => {
          config.set('language', it.value as 'zh' | 'en');
          await changeLanguage(it.value as 'zh' | 'en');
        }}
      />
      <Box marginTop={1}>
        <Text dimColor>Esc to return</Text>
      </Box>
    </Box>
  );
};
