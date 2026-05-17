import which from 'which';

export type PackageManager = 'brew' | 'apt' | 'dnf' | 'pacman';

const PKG_MAP: Record<string, Record<PackageManager, string>> = {
  '7z': { brew: 'p7zip', apt: 'p7zip-full', dnf: 'p7zip', pacman: 'p7zip' },
  zip: { brew: 'zip', apt: 'zip', dnf: 'zip', pacman: 'zip' },
  unzip: { brew: 'unzip', apt: 'unzip', dnf: 'unzip', pacman: 'unzip' },
  tar: { brew: 'gnu-tar', apt: 'tar', dnf: 'tar', pacman: 'tar' },
  gzip: { brew: 'gzip', apt: 'gzip', dnf: 'gzip', pacman: 'gzip' },
  bzip2: { brew: 'bzip2', apt: 'bzip2', dnf: 'bzip2', pacman: 'bzip2' },
  xz: { brew: 'xz', apt: 'xz-utils', dnf: 'xz', pacman: 'xz' },
  zstd: { brew: 'zstd', apt: 'zstd', dnf: 'zstd', pacman: 'zstd' },
};

export interface InstallCommand {
  pm: PackageManager;
  cmd: string;
  args: string[];
  needsSudo: boolean;
}

export interface ResolveCtx {
  available: PackageManager[];
}

export function getInstallCommand(
  platform: NodeJS.Platform | string,
  tool: string,
  ctx: ResolveCtx,
): InstallCommand | null {
  const pkgs = PKG_MAP[tool];
  if (!pkgs) return null;

  const order: PackageManager[] = platform === 'darwin' ? ['brew'] : ['apt', 'dnf', 'pacman'];

  for (const pm of order) {
    if (!ctx.available.includes(pm)) continue;
    const pkg = pkgs[pm];
    if (pm === 'brew') {
      return { pm, cmd: 'brew', args: ['install', pkg], needsSudo: false };
    }
    if (pm === 'apt') {
      return { pm, cmd: 'sudo', args: ['apt', 'install', '-y', pkg], needsSudo: true };
    }
    if (pm === 'dnf') {
      return { pm, cmd: 'sudo', args: ['dnf', 'install', '-y', pkg], needsSudo: true };
    }
    if (pm === 'pacman') {
      return { pm, cmd: 'sudo', args: ['pacman', '-S', '--noconfirm', pkg], needsSudo: true };
    }
  }
  return null;
}

export async function detectPackageManagers(): Promise<PackageManager[]> {
  const candidates: PackageManager[] = ['brew', 'apt', 'dnf', 'pacman'];
  const result: PackageManager[] = [];
  for (const pm of candidates) {
    try {
      await which(pm);
      result.push(pm);
    } catch {
      // ignore
    }
  }
  return result;
}
