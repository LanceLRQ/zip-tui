import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import { StatusBar } from '../../../src/tui/components/StatusBar';

describe('StatusBar', () => {
  it('renders provided hints', () => {
    const { lastFrame } = render(
      <StatusBar
        hints={[
          { key: '↑↓', label: 'navigate' },
          { key: 'Enter', label: 'confirm' },
        ]}
      />,
    );
    expect(lastFrame()).toContain('↑↓');
    expect(lastFrame()).toContain('navigate');
    expect(lastFrame()).toContain('Enter');
  });
});
