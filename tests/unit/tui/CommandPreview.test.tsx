import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import { CommandPreview } from '../../../src/tui/components/CommandPreview';

describe('CommandPreview', () => {
  it('renders the rendered command', () => {
    const { lastFrame } = render(
      <CommandPreview command={{ cmd: 'zip', args: ['-r', '-9', 'out.zip', 'src'] }} />,
    );
    const out = lastFrame() ?? '';
    expect(out).toContain('zip');
    expect(out).toContain('-r');
    expect(out).toContain('out.zip');
  });
});
