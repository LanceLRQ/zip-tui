import { describe, expect, it } from 'vitest';
import { useAppStore } from '../../../src/store';

describe('app store', () => {
  it('initializes with menu route', () => {
    useAppStore.getState().setRoute('menu');
    expect(useAppStore.getState().route).toBe('menu');
  });

  it('changes route via setRoute', () => {
    useAppStore.getState().setRoute('createWizard');
    expect(useAppStore.getState().route).toBe('createWizard');
  });

  it('wizard step progresses', () => {
    const s = useAppStore.getState();
    s.wizard.reset();
    s.wizard.next();
    expect(useAppStore.getState().wizard.step).toBe(1);
  });

  it('wizard prev clamps at zero', () => {
    const s = useAppStore.getState();
    s.wizard.reset();
    s.wizard.prev();
    expect(useAppStore.getState().wizard.step).toBe(0);
  });

  it('wizard setters mutate state', () => {
    const s = useAppStore.getState();
    s.wizard.reset();
    s.wizard.setArchive('out.zip');
    s.wizard.setInputs(['a', 'b']);
    s.wizard.setFormat('zip');
    s.wizard.setLevel(9);
    s.wizard.setExcludes(['node_modules/*']);
    s.wizard.setPassword('p@ss');
    const w = useAppStore.getState().wizard;
    expect(w.archive).toBe('out.zip');
    expect(w.inputs).toEqual(['a', 'b']);
    expect(w.format).toBe('zip');
    expect(w.level).toBe(9);
    expect(w.excludes).toEqual(['node_modules/*']);
    expect(w.password).toBe('p@ss');
  });

  it('deps.setStatus replaces tool status list', () => {
    useAppStore.getState().deps.setStatus([{ name: 'zip', available: true }]);
    expect(useAppStore.getState().deps.status).toEqual([{ name: 'zip', available: true }]);
  });

  it('execution lifecycle transitions states', () => {
    const e = useAppStore.getState().execution;
    e.start();
    expect(useAppStore.getState().execution.state).toBe('running');
    e.setProgress({ current: 50, total: 100 });
    expect(useAppStore.getState().execution.progress?.current).toBe(50);
    e.appendStderr('an error\n');
    expect(useAppStore.getState().execution.stderr).toContain('an error\n');
    e.finish(0);
    expect(useAppStore.getState().execution.state).toBe('success');
    e.start();
    e.finish(1);
    expect(useAppStore.getState().execution.state).toBe('failed');
    e.cancel();
    expect(useAppStore.getState().execution.state).toBe('cancelled');
  });

  it('config slice stores data snapshot', () => {
    const cfg = useAppStore.getState().config;
    const snapshot = { version: 1 as const, language: 'zh' as const };
    cfg.set(snapshot as unknown as Parameters<typeof cfg.set>[0]);
    expect(useAppStore.getState().config.data).not.toBeNull();
  });
});
