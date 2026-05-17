import type { StateCreator } from 'zustand';
import type { Progress } from '../engine/types.js';

export type ExecState = 'idle' | 'running' | 'success' | 'failed' | 'cancelled';

export interface ExecutionSlice {
  execution: {
    state: ExecState;
    progress: Progress | null;
    stderr: string[];
    exitCode: number | null;
    start: () => void;
    setProgress: (p: Progress | null) => void;
    appendStderr: (line: string) => void;
    finish: (exitCode: number) => void;
    cancel: () => void;
  };
}

export const createExecutionSlice: StateCreator<ExecutionSlice, [], [], ExecutionSlice> = (
  set,
) => ({
  execution: {
    state: 'idle',
    progress: null,
    stderr: [],
    exitCode: null,
    start: () =>
      set((s) => ({
        execution: { ...s.execution, state: 'running', progress: null, stderr: [], exitCode: null },
      })),
    setProgress: (p) => set((s) => ({ execution: { ...s.execution, progress: p } })),
    appendStderr: (line) =>
      set((s) => ({
        execution: { ...s.execution, stderr: [...s.execution.stderr, line].slice(-200) },
      })),
    finish: (exitCode) =>
      set((s) => ({
        execution: {
          ...s.execution,
          state: exitCode === 0 ? 'success' : 'failed',
          exitCode,
        },
      })),
    cancel: () => set((s) => ({ execution: { ...s.execution, state: 'cancelled' } })),
  },
});
