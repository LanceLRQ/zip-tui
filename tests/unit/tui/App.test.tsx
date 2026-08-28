import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { render } from 'ink-testing-library';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
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

/**
 * A directory of our own, never the working directory.
 *
 * BrowserPage reads its listing synchronously inside a render memo, so pointing
 * it at the repository root makes every mount walk node_modules — slow enough
 * under a loaded suite to blow past the default timeout, and the contents shift
 * with whatever the last build left behind.
 */
let dir = '';

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zt-app-'));
  fs.writeFileSync(path.join(dir, 'note.txt'), 'x');
});

afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

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
    const { lastFrame, unmount } = render(<App initialDir={dir} />);
    await flush();
    expect(lastFrame() ?? '').toContain('📂');
    unmount();
  });

  it('renders the dependencies page on the deps route', async () => {
    useAppStore.setState({ route: 'deps' });
    const { lastFrame, unmount } = render(<App initialDir={dir} />);
    await flush();
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Dependencies');
    expect(frame).not.toContain('📂');
    unmount();
  });

  /**
   * Given a longer budget than the 5s default because it mounts the app twice —
   * once on the dependencies page, once on the browser it returns to.
   *
   * That is genuinely slow here rather than a hang. Under the full suite every
   * Ink render costs upwards of 1.6s from worker contention (the plain
   * VirtualTree and ExecutionMonitor cases measure the same), against roughly
   * 250ms when this file runs alone. Two mounts plus a keystroke measured 5.9s,
   * which lands just past the default and made this the one case that failed
   * only in a full run. The ceiling below is triple that.
   */
  it('returns from the dependencies page to the browser on Esc', async () => {
    useAppStore.setState({ route: 'deps' });
    const { lastFrame, stdin, unmount } = render(<App initialDir={dir} />);
    await flush();
    expect(lastFrame() ?? '').toContain('Dependencies');

    stdin.write('\x1b');
    await flush();

    expect(useAppStore.getState().route).toBe('browser');
    expect(lastFrame() ?? '').toContain('📂');
    unmount();
  }, 20_000);
});
