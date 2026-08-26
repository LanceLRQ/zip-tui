import { Box } from 'ink';
import type React from 'react';
import { useEffect } from 'react';
import { detectAll } from '../deps/detect.js';
import { useAppStore } from '../store/index.js';
import { useTerminalRows } from './hooks/useTerminalRows.js';
import { CreateWizard } from './pages/CreateWizard.js';
import { DependenciesPage } from './pages/DependenciesPage.js';
import { ExtractWizard } from './pages/ExtractWizard.js';
import { MainMenu } from './pages/MainMenu.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { ViewPage } from './pages/ViewPage.js';

export const App: React.FC = () => {
  const route = useAppStore((s) => s.route);
  const setDepsStatus = useAppStore((s) => s.deps.setStatus);
  // re-renders on terminal resize, so the app keeps filling the window
  const rows = useTerminalRows();

  useEffect(() => {
    void detectAll().then(setDepsStatus);
  }, [setDepsStatus]);

  return (
    <Box flexDirection="column" padding={1} {...(rows > 0 ? { height: rows } : {})}>
      {route === 'menu' && <MainMenu />}
      {route === 'createWizard' && <CreateWizard />}
      {route === 'extractWizard' && <ExtractWizard />}
      {route === 'view' && <ViewPage />}
      {route === 'deps' && <DependenciesPage />}
      {route === 'settings' && <SettingsPage />}
    </Box>
  );
};
