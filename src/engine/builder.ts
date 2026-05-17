import { sevenzAdapter } from './adapters/sevenz.js';
import { targzAdapter } from './adapters/targz.js';
import { zipAdapter } from './adapters/zip.js';
import { createRegistry, type FormatRegistry } from './registry.js';

export function buildDefaultRegistry(): FormatRegistry {
  const r = createRegistry();
  r.register(zipAdapter);
  r.register(sevenzAdapter);
  r.register(targzAdapter);
  return r;
}
