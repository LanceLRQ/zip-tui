import { describe, expect, it } from 'vitest';
import { getInstallCommand } from '../../../src/deps/install';

describe('getInstallCommand', () => {
  it('returns brew command on darwin', () => {
    const c = getInstallCommand('darwin', '7z', { available: ['brew'] });
    expect(c).toEqual({ pm: 'brew', cmd: 'brew', args: ['install', 'p7zip'], needsSudo: false });
  });

  it('returns apt with sudo on linux when apt available', () => {
    const c = getInstallCommand('linux', '7z', { available: ['apt'] });
    expect(c).toEqual({
      pm: 'apt',
      cmd: 'sudo',
      args: ['apt', 'install', '-y', 'p7zip-full'],
      needsSudo: true,
    });
  });

  it('returns dnf when only dnf available', () => {
    const c = getInstallCommand('linux', 'zstd', { available: ['dnf'] });
    expect(c?.cmd).toBe('sudo');
    expect(c?.args).toEqual(['dnf', 'install', '-y', 'zstd']);
  });

  it('returns pacman when only pacman available', () => {
    const c = getInstallCommand('linux', 'xz', { available: ['pacman'] });
    expect(c?.cmd).toBe('sudo');
    expect(c?.args).toEqual(['pacman', '-S', '--noconfirm', 'xz']);
  });

  it('returns null when no package manager found', () => {
    expect(getInstallCommand('linux', '7z', { available: [] })).toBeNull();
  });

  it('returns null when tool unknown', () => {
    expect(getInstallCommand('darwin', 'unknown-tool-xyz', { available: ['brew'] })).toBeNull();
  });
});
