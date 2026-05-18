import { bz2Adapter } from './adapters/bz2.js';
import { gzAdapter } from './adapters/gz.js';
import { sevenzAdapter } from './adapters/sevenz.js';
import { tarAdapter } from './adapters/tar.js';
import { tarbz2Adapter } from './adapters/tarbz2.js';
import { targzAdapter } from './adapters/targz.js';
import { tarxzAdapter } from './adapters/tarxz.js';
import { tarzstAdapter } from './adapters/tarzst.js';
import { zipAdapter } from './adapters/zip.js';
import { createRegistry, type FormatRegistry } from './registry.js';

export function buildDefaultRegistry(): FormatRegistry {
  const r = createRegistry();
  r.register(zipAdapter);
  r.register(sevenzAdapter);
  r.register(targzAdapter);
  r.register(tarAdapter);
  r.register(tarbz2Adapter);
  r.register(tarxzAdapter);
  r.register(tarzstAdapter);
  r.register(gzAdapter);
  r.register(bz2Adapter);
  return r;
}
