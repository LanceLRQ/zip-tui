import type { StateCreator } from 'zustand';
import type { ToolStatus } from '../deps/detect.js';

export interface DepsSlice {
  deps: {
    status: ToolStatus[];
    setStatus: (s: ToolStatus[]) => void;
  };
}

export const createDepsSlice: StateCreator<DepsSlice, [], [], DepsSlice> = (set) => ({
  deps: {
    status: [],
    setStatus: (status) => set((s) => ({ deps: { ...s.deps, status } })),
  },
});
