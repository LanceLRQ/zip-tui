import { render } from 'ink';
import React from 'react';
import { type ParsedArgs, parseArgs } from './cli/parser.js';
import { detectAll } from './deps/detect.js';
import { buildDefaultRegistry } from './engine/builder.js';
import { getConfig } from './infra/config.js';
import { detectEnvFromProcess } from './infra/env.js';
import { initI18n } from './infra/i18n.js';
import {
  executeDirect,
  resolveCreateCommand,
  resolveExtractCommand,
  resolveListCommand,
} from './runner/direct.js';

async function launchTui(_args: ParsedArgs): Promise<number> {
  const { App } = await import('./tui/App.js');
  const { clearScreen } = await import('./tui/clearScreen.js');
  clearScreen();
  render(React.createElement(App));
  return 0;
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv);
  const env = detectEnvFromProcess();
  const config = getConfig();
  await initI18n(args.lang ?? (config.get('language') as 'zh' | 'en'));

  const registry = buildDefaultRegistry();

  if (args.subcommand === 'a') {
    if (!args.archive || !args.inputs || args.inputs.length === 0) {
      if (!env.interactive) {
        process.stderr.write('zt: missing archive or input files\n');
        return 2;
      }
      return launchTui(args);
    }
    const cmd = resolveCreateCommand(registry, {
      archive: args.archive,
      inputs: args.inputs,
      ...(args.level !== undefined ? { level: args.level } : {}),
      ...(args.excludes ? { excludes: args.excludes } : {}),
      ...(args.password ? { password: args.password } : {}),
    });
    return executeDirect(cmd, { dryRun: args.dryRun, stream: true });
  }

  if (args.subcommand === 'x') {
    if (!args.archive) {
      process.stderr.write('zt: missing archive\n');
      return 2;
    }
    const cmd = resolveExtractCommand(registry, {
      archive: args.archive,
      outputDir: args.outputDir ?? process.cwd(),
      ...(args.password ? { password: args.password } : {}),
    });
    return executeDirect(cmd, { dryRun: args.dryRun, stream: true });
  }

  if (args.subcommand === 'l') {
    if (!args.archive) {
      process.stderr.write('zt: missing archive\n');
      return 2;
    }
    const cmd = resolveListCommand(registry, args.archive);
    return executeDirect(cmd, { dryRun: args.dryRun });
  }

  if (args.subcommand === 'deps') {
    const status = await detectAll();
    for (const s of status) {
      process.stdout.write(
        `${s.available ? '✓' : '✗'} ${s.name}${s.version ? ` (${s.version})` : ''}\n`,
      );
    }
    return 0;
  }

  if (args.subcommand === 'config') {
    process.stdout.write(`${JSON.stringify(config.store, null, 2)}\n`);
    return 0;
  }

  // subcommand === null
  if (!env.interactive) {
    process.stderr.write("zt: missing subcommand (try 'zt --help')\n");
    return 2;
  }
  return launchTui(args);
}

main().then((code) => {
  if (code !== 0) process.exitCode = code;
});
