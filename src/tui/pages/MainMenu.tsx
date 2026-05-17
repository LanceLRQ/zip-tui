import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import type React from 'react';
import { type AppRoute, useAppStore } from '../../store/index.js';
import { StatusBar } from '../components/StatusBar.js';
import { useT } from '../hooks/useI18n.js';

type ItemValue = AppRoute | 'quit';

export const MainMenu: React.FC = () => {
  const t = useT();
  const setRoute = useAppStore((s) => s.setRoute);

  const items: { label: string; value: ItemValue }[] = [
    { label: t('menu.create'), value: 'createWizard' },
    { label: t('menu.extract'), value: 'extractWizard' },
    { label: t('menu.view'), value: 'view' },
    { label: t('menu.deps'), value: 'deps' },
    { label: t('menu.settings'), value: 'settings' },
    { label: t('menu.quit'), value: 'quit' },
  ];

  const onSelect = (item: { value: ItemValue }) => {
    if (item.value === 'quit') process.exit(0);
    setRoute(item.value);
  };

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
          { key: 'q', label: t('menu.quit') },
        ]}
      />
    </Box>
  );
};
