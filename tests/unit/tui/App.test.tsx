import { render } from 'ink-testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initI18n } from '../../../src/infra/i18n';
import { useAppStore } from '../../../src/store';
import { App } from '../../../src/tui/App';

/**
 * Guards the route-to-page mapping in App.
 *
 * `setRoute` only accepts `AppRoute`, so a misspelled route name is a type
 * error and needs no test. What the compiler cannot catch is the mapping
 * itself: `route === 'deps'` rendering SettingsPage type-checks perfectly and
 * would ship broken. That wiring — plus the default route being `browser` and
 * Esc returning there — is what these cases pin down.
 *
 * Use ink-testing-library rather than a hand-rolled stdin stub. A stub that
 * merely extends EventEmitter with isTTY/setRawMode gets no keystrokes
 * delivered: Ink ignores its `data` events, so every key press silently does
 * nothing and the assertions pass or fail for the wrong reason.
 *
 * `detectAll` is stubbed because App fires it on mount. Unstubbed it shells
 * out to `which` plus `--version` for all eight tools on every mount, which
 * is both slow and pointless here — no case looks at dependency status.
 */
vi.mock('../../../src/deps/detect', () => ({
  detectAll: vi.fn(async () => []),
}));

const flush = () => new Promise((r) => setTimeout(r, 40));

describe('App routing', () => {
  // the store is a module-level singleton, so each case resets it explicitly
  // instead of inheriting whatever the previous one left behind
  beforeEach(async () => {
    await initI18n('zh');
    useAppStore.setState({ route: 'browser' });
  });

  it('defaults to the browser and renders the address bar', async () => {
    // read the store's own initial value, not the current one: beforeEach has
    // already overwritten the latter, which would hide a changed default
    expect(useAppStore.getInitialState().route).toBe('browser');
    const { lastFrame, unmount } = render(<App initialDir={process.cwd()} />);
    await flush();
    expect(lastFrame() ?? '').toContain('📂');
    unmount();
  });

  it('renders the dependencies page on the deps route', async () => {
    useAppStore.setState({ route: 'deps' });
    const { lastFrame, unmount } = render(<App initialDir={process.cwd()} />);
    await flush();
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Dependencies');
    expect(frame).not.toContain('📂');
    unmount();
  });

  it('returns from the dependencies page to the browser on Esc', async () => {
    useAppStore.setState({ route: 'deps' });
    const { lastFrame, stdin, unmount } = render(<App initialDir={process.cwd()} />);
    await flush();
    expect(lastFrame() ?? '').toContain('Dependencies');

    stdin.write('\x1b');
    await flush();

    expect(useAppStore.getState().route).toBe('browser');
    expect(lastFrame() ?? '').toContain('📂');
    unmount();
  });
});
