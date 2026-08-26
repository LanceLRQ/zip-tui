import { Box, Text } from 'ink';
import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import { Divider } from '../../../src/tui/components/Divider';

describe('Divider', () => {
  it('draws a horizontal rule', () => {
    const { lastFrame } = render(<Divider />);
    expect(lastFrame() ?? '').toContain('─');
  });

  it('occupies exactly one row', () => {
    const { lastFrame } = render(
      <Box flexDirection="column">
        <Text>above</Text>
        <Divider />
        <Text>below</Text>
      </Box>,
    );
    expect((lastFrame() ?? '').split('\n')).toHaveLength(3);
  });

  it('spans the full width of its container', () => {
    const { lastFrame } = render(
      <Box flexDirection="column">
        <Text>x</Text>
        <Divider />
      </Box>,
    );
    const rule = (lastFrame() ?? '').split('\n')[1] ?? '';
    // ink-testing-library reports 100 columns
    expect(rule.length).toBe(100);
  });
});
