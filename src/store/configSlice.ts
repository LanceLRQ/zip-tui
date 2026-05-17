import type { StateCreator } from 'zustand';
import type { Config } from '../infra/config.js';

export interface ConfigSlice {
  config: {
    data: Config | null;
    set: (data: Config) => void;
  };
}

export const createConfigSlice: StateCreator<ConfigSlice, [], [], ConfigSlice> = (set) => ({
  config: {
    data: null,
    set: (data) => set((s) => ({ config: { ...s.config, data } })),
  },
});
