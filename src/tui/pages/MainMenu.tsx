import { Box, Text, useApp, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import type React from 'react';
import { type AppRoute, useAppStore } from '../../store/index.js';
import { StatusBar } from '../components/StatusBar.js';
import { useT } from '../hooks/useI18n.js';

type ItemValue = AppRoute | 'quit';

export const MainMenu: React.FC = () => {
  const t = useT();
  const setRoute = useAppStore((s) => s.setRoute);
  // must go through Ink rather than process.exit, otherwise teardown is skipped
  // and the terminal is left sitting in the alternate screen buffer
  const { exit } = useApp();

  const items: { label: string; value: ItemValue }[] = [
    { label: t('menu.create'), value: 'createWizard' },
    { label: t('menu.extract'), value: 'extractWizard' },
    { label: t('menu.view'), value: 'view' },
    { label: t('menu.deps'), value: 'deps' },
    { label: t('menu.settings'), value: 'settings' },
    { label: t('menu.quit'), value: 'quit' },
  ];

  const onSelect = (item: { value: ItemValue }) => {
    if (item.value === 'quit') {
      exit();
      return;
    }
    setRoute(item.value);
  };

  useInput((_input, key) => {
    if (key.escape) exit();
  });

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color="cyan" bold>
          {t('menu.title')} v0.1.0-dev
        </Text>
      </Box>
      <SelectInput items={items} onSelect={onSelect} />
      <StatusBar
        hints={[
          { key: '↑↓', label: t('common.next') },
          { key: 'Enter', label: t('common.confirm') },
          { key: 'Esc', label: t('menu.quit') },
        ]}
      />
    </Box>
  );
};
