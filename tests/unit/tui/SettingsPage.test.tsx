import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import { SettingsPage } from '../../../src/tui/pages/SettingsPage';

describe('SettingsPage', () => {
  it('renders header', () => {
    const { lastFrame } = render(<SettingsPage />);
    expect(lastFrame()).toContain('Settings');
  });
});
