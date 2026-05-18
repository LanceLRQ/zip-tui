import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import type React from 'react';
import { useState } from 'react';
import { buildDefaultRegistry } from '../../engine/builder.js';
import { streamCommand } from '../../engine/executor.js';
import { MVP_ARCHIVE_EXTENSIONS } from '../../engine/types.js';
import { resolveExtractCommand } from '../../runner/direct.js';
import { useAppStore } from '../../store/index.js';
import { CommandPreview } from '../components/CommandPreview.js';
import { ExecutionMonitor } from '../components/ExecutionMonitor.js';
import { FilePicker } from '../components/FilePicker.js';
import { useT } from '../hooks/useI18n.js';

type Step = 'archive' | 'output' | 'preview' | 'running';

export const ExtractWizard: React.FC = () => {
  const t = useT();
  const setRoute = useAppStore((s) => s.setRoute);
  const execution = useAppStore((s) => s.execution);

  const [step, setStep] = useState<Step>('archive');
  const [archive, setArchive] = useState('');
  const [outputDir, setOutputDir] = useState(process.cwd());

  if (step === 'archive') {
    return (
      <Box flexDirection="column">
        <Text>{t('menu.extract')} · 1/3</Text>
        <FilePicker
          key="extract-archive"
          mode="openFile"
          filterExtensions={[...MVP_ARCHIVE_EXTENSIONS]}
          onConfirm={(p) => {
            setArchive(p);
            setStep('output');
          }}
          onCancel={() => setRoute('menu')}
        />
      </Box>
    );
  }

  if (step === 'output') {
    return (
      <Box flexDirection="column">
        <Text>{t('menu.extract')} · 2/3</Text>
        <FilePicker
          key="extract-output"
          mode="openDir"
          initialPath={outputDir}
          onConfirm={(p) => {
            setOutputDir(p);
            setStep('preview');
          }}
          onCancel={() => setStep('archive')}
        />
      </Box>
    );
  }

  if (step === 'preview') {
    const registry = buildDefaultRegistry();
    const cmd = resolveExtractCommand(registry, { archive, outputDir });
    return (
      <Box flexDirection="column">
        <CommandPreview command={cmd} />
        <SelectInput
          items={[
            { label: t('common.run'), value: 'run' },
            { label: t('common.back'), value: 'back' },
          ]}
          onSelect={async (it) => {
            if (it.value === 'back') {
              setStep('output');
              return;
            }
            execution.start();
            setStep('running');
            const h = streamCommand(cmd);
            for await (const ev of h.events) {
              if (ev.type === 'stderr') execution.appendStderr(ev.data ?? '');
              if (ev.type === 'exit') execution.finish(ev.exitCode ?? -1);
            }
          }}
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <ExecutionMonitor
        state={execution.state}
        progress={execution.progress}
        stderrTail={execution.stderr}
        elapsedMs={0}
      />
      {execution.state !== 'running' && (
        <SelectInput
          items={[{ label: 'back to menu', value: 'menu' }]}
          onSelect={() => setRoute('menu')}
        />
      )}
    </Box>
  );
};
