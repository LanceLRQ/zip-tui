import Conf from 'conf';
import { z } from 'zod';
import { resolveFromProcess } from './fs.js';

export const ConfigSchema = z.object({
  version: z.literal(1).default(1),
  language: z.enum(['zh', 'en']).default('zh'),
  defaults: z.object({
    format: z
      .enum(['zip', '7z', 'tar.gz', 'tar.bz2', 'tar.xz', 'tar.zst', 'gz', 'bz2'])
      .default('tar.gz'),
    compressionLevel: z.number().int().min(1).max(9).default(6),
    excludePatterns: z.array(z.string()).default(['node_modules/**', '.git/**', '.DS_Store']),
    extractOverwritePolicy: z.enum(['ask', 'overwrite', 'skip', 'rename']).default('ask'),
  }),
  ui: z.object({
    showHiddenFiles: z.boolean().default(false),
    treePageSize: z.number().int().min(5).max(100).default(20),
  }),
  deps: z.object({
    allowAutoInstall: z.boolean().default(false),
    preferredPackageManager: z.enum(['auto', 'brew', 'apt', 'dnf', 'pacman']).default('auto'),
  }),
  update: z.object({
    checkOnStartup: z.boolean().default(true),
  }),
  lastUsed: z.object({
    directory: z.string().nullable().default(null),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;

export const defaultConfig: Config = ConfigSchema.parse({
  defaults: {},
  ui: {},
  deps: {},
  update: {},
  lastUsed: {},
});

let cached: Conf<Config> | null = null;

export function getConfig(): Conf<Config> {
  if (cached) return cached;
  const paths = resolveFromProcess();
  cached = new Conf<Config>({
    projectName: 'zip-tui',
    cwd: paths.configDir,
    defaults: defaultConfig,
  });
  return cached;
}
