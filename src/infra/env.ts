export interface EnvInput {
  isTTY: boolean;
  envVars: Record<string, string | undefined>;
}

export interface EnvResult {
  interactive: boolean;
  reason: 'stdin-not-tty' | 'ci-env' | 'zt-no-tui-env' | 'tty';
}

export function detectEnv(input: EnvInput): EnvResult {
  if (!input.isTTY) return { interactive: false, reason: 'stdin-not-tty' };
  if (input.envVars.CI) return { interactive: false, reason: 'ci-env' };
  if (input.envVars.ZT_NO_TUI) return { interactive: false, reason: 'zt-no-tui-env' };
  return { interactive: true, reason: 'tty' };
}

export function detectEnvFromProcess(): EnvResult {
  return detectEnv({
    isTTY: Boolean(process.stdin.isTTY),
    envVars: process.env,
  });
}
