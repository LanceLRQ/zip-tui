import { describe, expect, it } from 'vitest';
import { useAppStore } from '../../../src/store';

describe('app store', () => {
  it('initializes with the browser route', () => {
    expect(useAppStore.getState().route).toBe('browser');
  });

  it('changes route via setRoute', () => {
    useAppStore.getState().setRoute('deps');
    expect(useAppStore.getState().route).toBe('deps');
    useAppStore.getState().setRoute('settings');
    expect(useAppStore.getState().route).toBe('settings');
    useAppStore.getState().setRoute('browser');
    expect(useAppStore.getState().route).toBe('browser');
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
