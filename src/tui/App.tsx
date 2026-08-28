import { Box } from 'ink';
import type React from 'react';
import { useEffect } from 'react';
import { detectAll } from '../deps/detect.js';
import { useAppStore } from '../store/index.js';
import { useTerminalRows } from './hooks/useTerminalRows.js';
import { BrowserPage } from './pages/BrowserPage.js';
import { DependenciesPage } from './pages/DependenciesPage.js';
import { SettingsPage } from './pages/SettingsPage.js';

export interface AppProps {
  initialDir?: string;
  initialArchive?: string;
}

export const App: React.FC<AppProps> = ({ initialDir, initialArchive }) => {
  const route = useAppStore((s) => s.route);
  const setDepsStatus = useAppStore((s) => s.deps.setStatus);
  // re-renders on terminal resize, so the app keeps filling the window
  const rows = useTerminalRows();

  useEffect(() => {
    void detectAll().then(setDepsStatus);
  }, [setDepsStatus]);

  return (
    <Box flexDirection="column" padding={1} {...(rows > 0 ? { height: rows } : {})}>
      {route === 'browser' && (
        <BrowserPage
          {...(initialDir ? { initialDir } : {})}
          {...(initialArchive ? { initialArchive } : {})}
        />
      )}
      {route === 'deps' && <DependenciesPage />}
      {route === 'settings' && <SettingsPage />}
    </Box>
  );
};
