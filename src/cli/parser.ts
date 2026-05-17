import { Command } from 'commander';

export type Subcommand = 'a' | 'x' | 'l' | 'deps' | 'config' | null;

export interface ParsedArgs {
  subcommand: Subcommand;
  archive?: string;
  inputs?: string[];
  outputDir?: string;
  level?: number;
  excludes?: string[];
  password?: string;
  promptPassword?: boolean;
  encoding?: string;
  overwrite?: 'ask' | 'force' | 'skip' | 'rename';
  dryRun: boolean;
  verbose: boolean;
  lang?: 'zh' | 'en';
}

export function parseArgs(argv: string[]): ParsedArgs {
  const result: ParsedArgs = { subcommand: null, dryRun: false, verbose: false };

  const program = new Command();
  program
    .name('zt')
    .description('zip-tui: TUI archive command dispatcher')
    .option('--dry-run', 'print command without executing')
    .option('--verbose', 'enable debug logging')
    .option('--lang <lang>', 'temporary UI language (zh|en)');

  program
    .command('a <archive> [inputs...]')
    .description('compress (add)')
    .option('-l, --level <n>', 'compression level 1-9', (v) => Number.parseInt(v, 10))
    .option('-e, --exclude <pattern...>', 'glob exclude')
    .option('-p, --password <pass>', 'password (visible in ps)')
    .option('-P, --prompt-password', 'prompt for password interactively')
    .action((archive: string, inputs: string[], opts) => {
      result.subcommand = 'a';
      result.archive = archive;
      result.inputs = inputs;
      if (opts.level !== undefined) result.level = opts.level;
      if (opts.exclude) result.excludes = opts.exclude;
      if (opts.password) result.password = opts.password;
      if (opts.promptPassword) result.promptPassword = true;
    });

  program
    .command('x <archive>')
    .description('extract')
    .option('-o, --output <dir>', 'output directory')
    .option('-p, --password <pass>', 'password')
    .option('-P, --prompt-password', 'prompt for password')
    .option('--encoding <name>', 'filename encoding (gbk|shift_jis|cp437)')
    .option('--overwrite <mode>', 'ask|force|skip|rename')
    .action((archive: string, opts) => {
      result.subcommand = 'x';
      result.archive = archive;
      if (opts.output) result.outputDir = opts.output;
      if (opts.password) result.password = opts.password;
      if (opts.promptPassword) result.promptPassword = true;
      if (opts.encoding) result.encoding = opts.encoding;
      if (opts.overwrite) result.overwrite = opts.overwrite;
    });

  program
    .command('l <archive>')
    .description('list archive contents')
    .action((archive: string) => {
      result.subcommand = 'l';
      result.archive = archive;
    });

  program
    .command('deps')
    .description('dependency status')
    .action(() => {
      result.subcommand = 'deps';
    });

  program
    .command('config')
    .description('configuration')
    .action(() => {
      result.subcommand = 'config';
    });

  program.exitOverride();
  try {
    program.parse(argv);
  } catch {
    // commander throws on --help/--version or parse error; let caller decide
  }

  const opts = program.opts();
  if (opts.dryRun) result.dryRun = true;
  if (opts.verbose) result.verbose = true;
  if (opts.lang) result.lang = opts.lang;

  return result;
}
