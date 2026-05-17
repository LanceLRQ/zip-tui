import { describe, expect, it } from 'vitest';
import { detectEnv, detectEnvFromProcess } from '../../../src/infra/env';

describe('detectEnv', () => {
  it('returns interactive=false when stdin is not a TTY', () => {
    const env = detectEnv({ isTTY: false, envVars: {} });
    expect(env.interactive).toBe(false);
    expect(env.reason).toBe('stdin-not-tty');
  });

  it('returns interactive=false when CI=1', () => {
    const env = detectEnv({ isTTY: true, envVars: { CI: '1' } });
    expect(env.interactive).toBe(false);
    expect(env.reason).toBe('ci-env');
  });

  it('returns interactive=false when ZT_NO_TUI is set', () => {
    const env = detectEnv({ isTTY: true, envVars: { ZT_NO_TUI: '1' } });
    expect(env.interactive).toBe(false);
    expect(env.reason).toBe('zt-no-tui-env');
  });

  it('returns interactive=true on plain TTY', () => {
    const env = detectEnv({ isTTY: true, envVars: {} });
    expect(env.interactive).toBe(true);
    expect(env.reason).toBe('tty');
  });

  it('detectEnvFromProcess reads process.stdin.isTTY and env', () => {
    const env = detectEnvFromProcess();
    expect(env.interactive).toBe(false);
    expect(env.reason).toMatch(/stdin-not-tty|ci-env|zt-no-tui-env/);
  });
});
