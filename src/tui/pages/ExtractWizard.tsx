import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import type React from 'react';
import { useState } from 'react';
import { buildDefaultRegistry } from '../../engine/builder.js';
import { streamCommand } from '../../engine/executor.js';
import { resolveExtractCommand } from '../../runner/direct.js';
import { useAppStore } from '../../store/index.js';
import { CommandPreview } from '../components/CommandPreview.js';
import { ExecutionMonitor } from '../components/ExecutionMonitor.js';
import { StatusBar } from '../components/StatusBar.js';

type Step = 'archive' | 'output' | 'preview' | 'running';

export const ExtractWizard: React.FC = () => {
  const setRoute = useAppStore((s) => s.setRoute);
  const execution = useAppStore((s) => s.execution);

  const [step, setStep] = useState<Step>('archive');
  const [archive, setArchive] = useState('');
  const [outputDir, setOutputDir] = useState(process.cwd());

  useInput((_input, key) => {
    if (key.escape) {
      if (step === 'archive') setRoute('menu');
      else if (step === 'output') setStep('archive');
      else if (step === 'preview') setStep('output');
    }
  });

  if (step === 'archive') {
    return (
      <Box flexDirection="column">
        <Text>extract · archive path:</Text>
        <TextInput value={archive} onChange={setArchive} onSubmit={() => setStep('output')} />
        <StatusBar
          hints={[
            { key: 'Esc', label: 'back' },
            { key: 'Enter', label: 'next' },
          ]}
        />
      </Box>
    );
  }

  if (step === 'output') {
    return (
      <Box flexDirection="column">
        <Text>output dir:</Text>
        <TextInput value={outputDir} onChange={setOutputDir} onSubmit={() => setStep('preview')} />
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
            { label: 'run', value: 'run' },
            { label: 'back', value: 'back' },
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
