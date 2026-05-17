import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import type React from 'react';
import { useState } from 'react';
import { buildDefaultRegistry } from '../../engine/builder.js';
import { streamCommand } from '../../engine/executor.js';
import { createProgressTracker } from '../../engine/progress.js';
import { startSizePoll } from '../../engine/sizePoll.js';
import type { FormatId } from '../../engine/types.js';
import { useAppStore } from '../../store/index.js';
import { CommandPreview } from '../components/CommandPreview.js';
import { ExecutionMonitor } from '../components/ExecutionMonitor.js';
import { StatusBar } from '../components/StatusBar.js';
import { listDirectoryAsNodes } from '../components/useDirectoryTree.js';
import { VirtualTree } from '../components/VirtualTree.js';
import { useT } from '../hooks/useI18n.js';

const FORMATS: { label: string; value: FormatId }[] = [
  { label: 'zip', value: 'zip' },
  { label: '7z', value: '7z' },
  { label: 'tar.gz', value: 'tar.gz' },
];

export const CreateWizard: React.FC = () => {
  const t = useT();
  const wizard = useAppStore((s) => s.wizard);
  const setRoute = useAppStore((s) => s.setRoute);
  const execution = useAppStore((s) => s.execution);

  const [cwd] = useState(process.cwd());
  const [nodes] = useState(() => listDirectoryAsNodes(cwd, { depth: 0, showHidden: false }));
  const [cursor, setCursor] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useInput((input, key) => {
    if (key.escape) {
      if (wizard.step === 0) setRoute('menu');
      else wizard.prev();
    }
    if (wizard.step === 1) {
      if (key.upArrow) setCursor((c) => Math.max(0, c - 1));
      if (key.downArrow) setCursor((c) => Math.min(nodes.length - 1, c + 1));
      if (input === ' ') {
        const id = nodes[cursor]?.id;
        if (id) {
          setSelected((s) => {
            const n = new Set(s);
            if (n.has(id)) n.delete(id);
            else n.add(id);
            return n;
          });
        }
      }
      if (key.return) {
        wizard.setInputs([...selected]);
        wizard.next();
      }
    }
  });

  if (wizard.step === 0) {
    return (
      <Box flexDirection="column">
        <Text>{t('menu.create')} · 1/5</Text>
        <Text>archive name:</Text>
        <TextInput
          value={wizard.archive}
          onChange={wizard.setArchive}
          onSubmit={() => wizard.next()}
        />
        <StatusBar hints={[{ key: 'Esc', label: t('common.back') }]} />
      </Box>
    );
  }

  if (wizard.step === 1) {
    return (
      <Box flexDirection="column">
        <Text>2/5 select files (cwd={cwd})</Text>
        <VirtualTree
          nodes={nodes}
          pageSize={15}
          selectedIndex={cursor}
          selectedIds={selected}
          onToggle={() => {}}
        />
        <StatusBar
          hints={[
            { key: '↑↓', label: 'nav' },
            { key: 'Space', label: 'toggle' },
            { key: 'Enter', label: 'next' },
            { key: 'Esc', label: t('common.back') },
          ]}
        />
      </Box>
    );
  }

  if (wizard.step === 2) {
    return (
      <Box flexDirection="column">
        <Text>3/5 format</Text>
        <SelectInput
          items={FORMATS}
          onSelect={(it) => {
            wizard.setFormat(it.value as FormatId);
            wizard.next();
          }}
        />
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
