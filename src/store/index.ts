import { create } from 'zustand';
import { type ConfigSlice, createConfigSlice } from './configSlice.js';
import { createDepsSlice, type DepsSlice } from './depsSlice.js';
import { createExecutionSlice, type ExecutionSlice } from './executionSlice.js';
import { createWizardSlice, type WizardSlice } from './wizardSlice.js';

export type AppRoute = 'menu' | 'createWizard' | 'extractWizard' | 'view' | 'deps' | 'settings';

export interface RouteSlice {
  route: AppRoute;
  setRoute: (r: AppRoute) => void;
}

export type AppState = RouteSlice & WizardSlice & DepsSlice & ExecutionSlice & ConfigSlice;

export const useAppStore = create<AppState>()((...a) => ({
  route: 'menu' as AppRoute,
  setRoute: (route) => a[0]({ route } as Partial<AppState>),
  ...createWizardSlice(...a),
  ...createDepsSlice(...a),
  ...createExecutionSlice(...a),
  ...createConfigSlice(...a),
}));
