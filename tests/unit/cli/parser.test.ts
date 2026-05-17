import { describe, expect, it } from 'vitest';
import { parseArgs } from '../../../src/cli/parser';

describe('parseArgs', () => {
  it('parses bare invocation', () => {
    expect(parseArgs(['node', 'zt'])).toMatchObject({ subcommand: null });
  });

  it('parses `a` with archive and inputs', () => {
    expect(parseArgs(['node', 'zt', 'a', 'out.zip', 'src', 'docs'])).toMatchObject({
      subcommand: 'a',
      archive: 'out.zip',
      inputs: ['src', 'docs'],
    });
  });

  it('parses `x` with output dir', () => {
    expect(parseArgs(['node', 'zt', 'x', 'a.zip', '-o', '/tmp'])).toMatchObject({
      subcommand: 'x',
      archive: 'a.zip',
      outputDir: '/tmp',
    });
  });

  it('parses --dry-run global flag', () => {
    expect(parseArgs(['node', 'zt', 'a', 'out.zip', 'src', '--dry-run'])).toMatchObject({
      subcommand: 'a',
      dryRun: true,
    });
  });

  it('parses `l` for list', () => {
    expect(parseArgs(['node', 'zt', 'l', 'a.zip'])).toMatchObject({
      subcommand: 'l',
      archive: 'a.zip',
    });
  });

  it('parses `deps` and `config`', () => {
    expect(parseArgs(['node', 'zt', 'deps'])).toMatchObject({ subcommand: 'deps' });
    expect(parseArgs(['node', 'zt', 'config'])).toMatchObject({ subcommand: 'config' });
  });
});
