import { Box, Text } from 'ink';
import type React from 'react';
import { useT } from '../hooks/useI18n.js';

/** Entries at the bottom of the panel, in cursor order. */
export const HELP_ENTRIES = ['deps', 'settings'] as const;
export type HelpEntry = (typeof HELP_ENTRIES)[number];

export interface HelpPanelProps {
  /** Index into `HELP_ENTRIES`. */
  cursor: number;
}

/**
 * Every key, plus the two low-frequency pages.
 *
 * Dependency checking and settings lost their top-level entry when the main
 * menu went away. They live here because someone who cannot find them will
 * press `?` first, and because they do not deserve to occupy width on the hint
 * line that the actual actions need.
 *
 * Each group's label sits on its own line above its keys rather than beside
 * them in a fixed-width column. A fixed width that fits 导航 truncates
 * `Navigate`, and a locale-dependent layout bug is one that survives testing.
 * Full-width key lines also wrap instead of truncating, which is what a panel
 * you read rather than scan wants.
 */
export const HelpPanel: React.FC<HelpPanelProps> = ({ cursor }) => {
  const t = useT();
  const groups: readonly (readonly [string, string])[] = [
    [t('help.groupNav'), t('help.nav')],
    [t('help.groupSelect'), t('help.select')],
    [t('help.groupAction'), t('help.action')],
    [t('help.groupView'), t('help.view')],
  ];

  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1}>
      <Text bold>{t('help.title')}</Text>
      {groups.map(([name, keys]) => (
        <Box key={name} flexDirection="column">
          <Text color="cyan">{name}</Text>
          <Text dimColor>{keys}</Text>
        </Box>
      ))}
      <Box
        borderStyle="single"
        borderBottom={false}
        borderLeft={false}
        borderRight={false}
        marginTop={1}
      >
        {HELP_ENTRIES.map((entry, i) => (
          <Box key={entry} marginRight={3}>
            <Text {...(i === cursor ? { color: 'cyan', bold: true } : {})}>
              {i === cursor ? '▶ ' : '  '}
              {t(`help.${entry}`)}
            </Text>
          </Box>
        ))}
      </Box>
      <Text dimColor>{t('help.close')}</Text>
    </Box>
  );
};
