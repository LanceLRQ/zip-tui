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

  it('shows the cursor and checkbox indicators', () => {
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

  it('omits the checkbox column when selectedIds is undefined', () => {
    const { lastFrame } = render(
      <VirtualTree nodes={nodes.slice(0, 3)} pageSize={5} selectedIndex={0} />,
    );
    const out = lastFrame() ?? '';
    expect(out).not.toContain('[x]');
    expect(out).not.toContain('[ ]');
    expect(out).toContain('item-0');
  });

  it('marks directories with a trailing Enter glyph and leaves files plain', () => {
    const mixed: TreeNode[] = [
      { id: 'd1', label: 'folder', isDir: true, size: 0 },
      { id: 'f1', label: 'file.txt', isDir: false, size: 1 },
    ];
    const { lastFrame } = render(<VirtualTree nodes={mixed} pageSize={5} selectedIndex={0} />);
    const out = lastFrame() ?? '';
    expect(out).toContain('folder →');
    expect(out).toContain('file.txt');
    // the file row must not carry the directory marker
    expect(out).not.toContain('file.txt →');
  });

  it('renders the parent entry without a checkbox', () => {
    const withParent: TreeNode[] = [
      { id: '__parent__', label: '..', isDir: true, size: 0 },
      { id: 'd1', label: 'folder', isDir: true, size: 0 },
    ];
    const { lastFrame } = render(
      <VirtualTree
        nodes={withParent}
        pageSize={5}
        selectedIndex={0}
        selectedIds={new Set()}
        parentId="__parent__"
      />,
    );
    const out = lastFrame() ?? '';
    // the child directory still gets a checkbox; the parent does not
    expect(out).toContain('[ ] folder');
    expect(out).not.toContain('[ ] ..');
    // the parent means "go up", so it carries no directory marker
    expect(out).not.toContain('.. →');
    // the real child directory still does
    expect(out).toContain('folder →');
  });
});
