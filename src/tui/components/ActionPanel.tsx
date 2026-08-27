import { Box, Text } from 'ink';
import type React from 'react';
import type { BuiltCommand, FormatId } from '../../engine/types.js';
import { useT } from '../hooks/useI18n.js';
import { CommandPreview } from './CommandPreview.js';

export interface ActionPanelProps {
  kind: 'compress' | 'extract';
  title: string;
  /** Compress only. */
  format?: FormatId | undefined;
  /** Compress only. */
  level?: number | undefined;
  /** Destination: the new archive when compressing, the folder when extracting. */
  output: string;
  /** Extract only: localised "Everything" or "{{count}} marked". */
  scopeLabel?: string | undefined;
  command: BuiltCommand;
  /** Index of the focused field, in the order rendered. */
  focusField: number;
  /**
   * Rows the command preview may occupy before being clipped.
   *
   * A long input list wraps past the terminal height, and whatever overflows is
   * lost. The controls must not be what is lost — a panel with no visible way
   * to cancel traps the user — so the preview is clipped instead. Omit to let
   * it grow freely, which is fine for short commands.
   */
  previewRows?: number | undefined;
  /**
   * Something the user should know but may proceed past — most often that the
   * destination already exists.
   */
  warning?: string | undefined;
  /** Something that prevents running, such as an empty output path. */
  error?: string | undefined;
}

interface FieldProps {
  label: string;
  value: string;
  focused: boolean;
}

const Field: React.FC<FieldProps> = ({ label, value, focused }) => (
  <Box>
    <Box flexShrink={0}>
      <Text {...(focused ? { color: 'cyan', bold: true } : { dimColor: true })}>
        {focused ? '▸ ' : '  '}
        {label}
      </Text>
      <Text dimColor>{'  '}</Text>
    </Box>
    <Box flexShrink={1}>
      <Text wrap="truncate-start">{value}</Text>
    </Box>
  </Box>
);

/**
 * Everything a run needs, on one screen.
 *
 * The five-step wizard this replaces only showed the command on its last step,
 * which is backwards for a tool whose pitch is that the command is visible.
 * Here the preview sits under the fields and updates as they change, so there
 * is never a moment where you are about to run something unseen.
 *
 * The destination is always shown in full and truncates from the left, because
 * the extraction default is not a fixed rule — it depends on what is inside the
 * archive — and a user cannot sanity-check a path they cannot read.
 *
 * A warning and an error are separate: the underlying tools overwrite or merge
 * silently on collision, so "this already exists" has to be visible without
 * looking like a failure the user cannot proceed past.
 */
export const ActionPanel: React.FC<ActionPanelProps> = ({
  kind,
  title,
  format,
  level,
  output,
  scopeLabel,
  command,
  focusField,
  previewRows,
  warning,
  error,
}) => {
  const t = useT();
  const fields: FieldProps[] =
    kind === 'compress'
      ? [
          { label: t('action.fieldFormat'), value: format ?? '', focused: focusField === 0 },
          { label: t('action.fieldLevel'), value: String(level ?? ''), focused: focusField === 1 },
          { label: t('action.fieldOutput'), value: output, focused: focusField === 2 },
        ]
      : [
          { label: t('action.fieldScope'), value: scopeLabel ?? '', focused: focusField === 0 },
          { label: t('action.fieldTarget'), value: output, focused: focusField === 1 },
        ];

  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1}>
      <Text bold>{title}</Text>
      {fields.map((f) => (
        <Field key={f.label} label={f.label} value={f.value} focused={f.focused} />
      ))}
      {previewRows === undefined ? (
        <CommandPreview command={command} />
      ) : (
        <Box height={previewRows} overflow="hidden" flexDirection="column">
          <CommandPreview command={command} />
        </Box>
      )}
      {warning ? <Text color="yellow">{warning}</Text> : null}
      {error ? <Text color="red">{error}</Text> : null}
      <Text dimColor wrap="truncate">
        Enter {t('common.run')} · Tab {t('common.next')} · Esc {t('common.cancel')}
      </Text>
    </Box>
  );
};
