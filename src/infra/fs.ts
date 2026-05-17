import os from 'node:os';
import path from 'node:path';

export interface PathInput {
  home: string;
  envVars: Record<string, string | undefined>;
}

export interface ResolvedPaths {
  configDir: string;
  configFile: string;
  cacheDir: string;
  logDir: string;
}

export function resolvePaths(input: PathInput): ResolvedPaths {
  const xdgConfig = input.envVars.XDG_CONFIG_HOME ?? path.join(input.home, '.config');
  const xdgCache = input.envVars.XDG_CACHE_HOME ?? path.join(input.home, '.cache');
  const configDir = path.join(xdgConfig, 'zip-tui');
  const cacheDir = path.join(xdgCache, 'zip-tui');
  return {
    configDir,
    configFile: path.join(configDir, 'config.json'),
    cacheDir,
    logDir: path.join(cacheDir, 'logs'),
  };
}

export function resolveFromProcess(): ResolvedPaths {
  return resolvePaths({ home: os.homedir(), envVars: process.env });
}
