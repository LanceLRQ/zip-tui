import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import { DependenciesPage } from '../../../src/tui/pages/DependenciesPage';

describe('DependenciesPage', () => {
  it('renders header', () => {
    const { lastFrame } = render(<DependenciesPage />);
    expect(lastFrame()).toContain('Dependencies');
  });
});
