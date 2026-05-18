import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import type React from 'react';
import { buildDefaultRegistry } from '../../engine/builder.js';
import { streamCommand } from '../../engine/executor.js';
import { createProgressTracker } from '../../engine/progress.js';
import { startSizePoll } from '../../engine/sizePoll.js';
import { defaultArchiveName, FORMAT_EXTENSIONS, type FormatId } from '../../engine/types.js';
import { useAppStore } from '../../store/index.js';
import { CommandPreview } from '../components/CommandPreview.js';
import { ExecutionMonitor } from '../components/ExecutionMonitor.js';
import { FilePicker } from '../components/FilePicker.js';
import { StatusBar } from '../components/StatusBar.js';
import { useT } from '../hooks/useI18n.js';

const FORMATS: { label: string; value: FormatId }[] = [
  { label: '7z', value: '7z' },
  { label: 'zip', value: 'zip' },
  { label: 'tar.gz', value: 'tar.gz' },
  { label: 'tar.bz2', value: 'tar.bz2' },
  { label: 'tar.xz', value: 'tar.xz' },
  { label: 'tar.zst', value: 'tar.zst' },
  { label: 'tar', value: 'tar' },
  { label: 'gz (single file)', value: 'gz' },
  { label: 'bz2 (single file)', value: 'bz2' },
];

function isSingleInputFormat(format: FormatId): boolean {
  return format === 'gz' || format === 'bz2';
}

export const CreateWizard: React.FC = () => {
  const t = useT();
  const wizard = useAppStore((s) => s.wizard);
  const setRoute = useAppStore((s) => s.setRoute);
  const execution = useAppStore((s) => s.execution);

  useInput(
    (_input, key) => {
      if (key.escape && wizard.step === 0) setRoute('menu');
      else if (key.escape && wizard.step >= 3 && wizard.step <= 4) wizard.prev();
    },
    { isActive: wizard.step === 0 || (wizard.step >= 3 && wizard.step <= 4) },
  );

  if (wizard.step === 0) {
    return (
      <Box flexDirection="column">
        <Text>{t('menu.create')} · 1/5 format</Text>
        <SelectInput
          items={FORMATS}
          onSelect={(it) => {
            wizard.setFormat(it.value as FormatId);
            wizard.next();
          }}
        />
        <StatusBar hints={[{ key: 'Esc', label: t('common.back') }]} />
      </Box>
    );
  }

  if (wizard.step === 1 && wizard.format) {
    const exts = [...FORMAT_EXTENSIONS[wizard.format]];
    return (
      <Box flexDirection="column">
        <Text>{t('menu.create')} · 2/5</Text>
        <FilePicker
          mode="saveFile"
          filterExtensions={exts}
          defaultFilename={defaultArchiveName(wizard.format)}
          onConfirm={(p) => {
            wizard.setArchive(p);
            wizard.next();
          }}
          onCancel={() => wizard.prev()}
        />
      </Box>
    );
  }

  if (wizard.step === 2 && wizard.format) {
    const singleInput = isSingleInputFormat(wizard.format);
    return (
      <Box flexDirection="column">
        <Text>
          {t('menu.create')} · 3/5
          {singleInput && ` · ${t('picker.singleInputHint')}`}
        </Text>
        {singleInput ? (
          <FilePicker
            mode="openFile"
            onConfirm={(p) => {
              wizard.setInputs([p]);
              wizard.next();
            }}
            onCancel={() => wizard.prev()}
          />
        ) : (
          <FilePicker
            mode="multiSelect"
            onConfirm={(ids) => {
              wizard.setInputs(ids);
              wizard.next();
            }}
            onCancel={() => wizard.prev()}
          />
        )}
      </Box>
    );
  }

  if (wizard.step === 3) {
    return (
      <Box flexDirection="column">
        <Text>4/5 level (current: {wizard.level})</Text>
        <SelectInput
          items={[1, 3, 6, 9].map((n) => ({ label: `level ${n}`, value: n }))}
          onSelect={(it) => {
            wizard.setLevel(it.value as number);
            wizard.next();
          }}
        />
        <StatusBar hints={[{ key: 'Esc', label: t('common.back') }]} />
      </Box>
    );
  }

  if (wizard.step === 4 && wizard.format) {
    const registry = buildDefaultRegistry();
    const adapter = registry.get(wizard.format);
    const cmd = adapter.buildCreate({
      archive: wizard.archive,
      inputs: wizard.inputs,
      level: wizard.level,
      excludes: wizard.excludes,
    });
    return (
      <Box flexDirection="column">
        <Text>5/5 preview</Text>
        <CommandPreview command={cmd} />
        <SelectInput
          items={[
            { label: t('common.run'), value: 'run' },
            { label: t('common.back'), value: 'back' },
          ]}
          onSelect={async (it) => {
            if (it.value === 'back') {
              wizard.prev();
              return;
            }
            execution.start();
            wizard.next();
            const handle = streamCommand(cmd);
            const tracker = createProgressTracker(adapter, (p) => execution.setProgress(p));
            const stopPoll = adapter.parseProgress
              ? () => {}
              : startSizePoll(wizard.archive, 500, () => {});
            for await (const ev of handle.events) {
              if (ev.type === 'stdout') tracker.feed(ev.data ?? '');
              if (ev.type === 'stderr') {
                tracker.feed(ev.data ?? '');
                execution.appendStderr(ev.data ?? '');
              }
              if (ev.type === 'exit') {
                stopPoll();
                execution.finish(ev.exitCode ?? -1);
              }
            }
          }}
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text>execution</Text>
      <ExecutionMonitor
        state={execution.state}
        progress={execution.progress}
        stderrTail={execution.stderr}
        elapsedMs={0}
      />
      {execution.state !== 'running' && (
        <Box marginTop={1}>
          <SelectInput
            items={[{ label: 'back to menu', value: 'menu' }]}
            onSelect={() => {
              setRoute('menu');
              wizard.reset();
            }}
          />
        </Box>
      )}
    </Box>
  );
};
