import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import { GlobInput } from '../../../src/tui/components/GlobInput';

describe('GlobInput', () => {
  it('renders prompt and current value', () => {
    const { lastFrame } = render(
      <GlobInput value="src/**/*.ts" onChange={() => {}} onSubmit={() => {}} />,
    );
    expect(lastFrame()).toContain('src/**/*.ts');
  });
});
