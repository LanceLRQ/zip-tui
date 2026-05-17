import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import { type TreeNode, VirtualTree } from '../../../src/tui/components/VirtualTree';

const nodes: TreeNode[] = Array.from({ length: 1000 }, (_, i) => ({
  id: `n${i}`,
  label: `item-${i}`,
  isDir: false,
  size: i,
}));

describe('VirtualTree', () => {
  it('renders only visible window', () => {
    const { lastFrame } = render(
      <VirtualTree
        nodes={nodes}
        pageSize={5}
        selectedIndex={0}
        selectedIds={new Set()}
        onToggle={() => {}}
      />,
    );
    const out = lastFrame() ?? '';
    expect(out).toContain('item-0');
    expect(out).toContain('item-4');
    expect(out).not.toContain('item-50');
  });

  it('shows selected indicator', () => {
    const { lastFrame } = render(
      <VirtualTree
        nodes={nodes}
        pageSize={5}
        selectedIndex={2}
        selectedIds={new Set(['n2'])}
        onToggle={() => {}}
      />,
    );
    expect(lastFrame()).toContain('▶');
    expect(lastFrame()).toContain('[x]');
  });
});
