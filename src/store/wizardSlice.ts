import type { StateCreator } from 'zustand';
import type { FormatId } from '../engine/types.js';

export interface WizardState {
  step: number;
  archive: string;
  inputs: string[];
  format: FormatId | null;
  level: number;
  excludes: string[];
  password: string | null;
  reset: () => void;
  next: () => void;
  prev: () => void;
  setArchive: (s: string) => void;
  setInputs: (i: string[]) => void;
  setFormat: (f: FormatId) => void;
  setLevel: (n: number) => void;
  setExcludes: (e: string[]) => void;
  setPassword: (p: string | null) => void;
}

export interface WizardSlice {
  wizard: WizardState;
}

export const createWizardSlice: StateCreator<WizardSlice, [], [], WizardSlice> = (set) => ({
  wizard: {
    step: 0,
    archive: '',
    inputs: [],
    format: '7z',
    level: 6,
    excludes: [],
    password: null,
    reset: () =>
      set((s) => ({
        wizard: {
          ...s.wizard,
          step: 0,
          archive: '',
          inputs: [],
          format: '7z',
          level: 6,
          excludes: [],
          password: null,
        },
      })),
    next: () => set((s) => ({ wizard: { ...s.wizard, step: s.wizard.step + 1 } })),
    prev: () => set((s) => ({ wizard: { ...s.wizard, step: Math.max(0, s.wizard.step - 1) } })),
    setArchive: (v) => set((s) => ({ wizard: { ...s.wizard, archive: v } })),
    setInputs: (v) => set((s) => ({ wizard: { ...s.wizard, inputs: v } })),
    setFormat: (v) => set((s) => ({ wizard: { ...s.wizard, format: v } })),
    setLevel: (v) => set((s) => ({ wizard: { ...s.wizard, level: v } })),
    setExcludes: (v) => set((s) => ({ wizard: { ...s.wizard, excludes: v } })),
    setPassword: (v) => set((s) => ({ wizard: { ...s.wizard, password: v } })),
  },
});
