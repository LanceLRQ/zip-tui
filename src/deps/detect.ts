import { execa } from 'execa';
import which from 'which';

export const KNOWN_TOOLS = ['zip', 'unzip', '7z', 'tar', 'gzip', 'bzip2', 'xz', 'zstd'] as const;

export type ToolName = (typeof KNOWN_TOOLS)[number] | string;

export interface ToolStatus {
  name: string;
  available: boolean;
  version?: string;
  path?: string;
}

export async function detectTool(
  name: string,
  options: { versionFlag?: string } = {},
): Promise<ToolStatus> {
  try {
    const p = await which(name);
    let version: string | undefined;
    try {
      const r = await execa(p, [options.versionFlag ?? '--version'], {
        reject: false,
        timeout: 3000,
      });
      version = (r.stdout || r.stderr).split('\n')[0]?.trim();
    } catch {
      // ignore
    }
    return { name, available: true, path: p, ...(version ? { version } : {}) };
  } catch {
    return { name, available: false };
  }
}

export async function detectAll(): Promise<ToolStatus[]> {
  return Promise.all(KNOWN_TOOLS.map((t) => detectTool(t)));
}
