import { create } from 'zustand';
import { type ConfigSlice, createConfigSlice } from './configSlice.js';
import { createDepsSlice, type DepsSlice } from './depsSlice.js';
import { createExecutionSlice, type ExecutionSlice } from './executionSlice.js';

export type AppRoute = 'browser' | 'deps' | 'settings';

export interface RouteSlice {
  route: AppRoute;
  setRoute: (r: AppRoute) => void;
}

export type AppState = RouteSlice & DepsSlice & ExecutionSlice & ConfigSlice;

export const useAppStore = create<AppState>()((...a) => ({
  route: 'browser' as AppRoute,
  setRoute: (route) => a[0]({ route } as Partial<AppState>),
  ...createDepsSlice(...a),
  ...createExecutionSlice(...a),
  ...createConfigSlice(...a),
}));
