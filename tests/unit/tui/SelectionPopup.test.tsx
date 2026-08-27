import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import type { SelectionItem } from '../../../src/tui/browser/selection';
import { SelectionPopup } from '../../../src/tui/components/SelectionPopup';

const ITEMS: SelectionItem[] = [
  { path: '/w/proj/src', isDir: true, size: 0 },
  { path: '/w/proj/docs/guide.md', isDir: false, size: 12000 },
];

describe('SelectionPopup', () => {
  it('lists every marked path', () => {
    const { lastFrame } = render(
      <SelectionPopup items={ITEMS} cursor={0} pageSize={10} title="已选 2 项" hint="d 移除" />,
    );
    const out = lastFrame() ?? '';
    expect(out).toContain('/w/proj/src');
    expect(out).toContain('guide.md');
  });

  it('shows the title and hint', () => {
    const { lastFrame } = render(
      <SelectionPopup items={ITEMS} cursor={0} pageSize={10} title="已选 2 项" hint="d 移除" />,
    );
    expect(lastFrame() ?? '').toContain('已选 2 项');
    expect(lastFrame() ?? '').toContain('d 移除');
  });

  // marks made in directories that scrolled away are invisible otherwise, so
  // an empty popup has to say what to do rather than showing a blank box
  it('shows a prompt instead of an empty box when nothing is marked', () => {
    const { lastFrame } = render(
      <SelectionPopup
        items={[]}
        cursor={0}
        pageSize={10}
        title="已选 0 项"
        hint="d 移除"
        emptyLabel="用 Space 标记"
      />,
    );
    expect(lastFrame() ?? '').toContain('用 Space 标记');
  });

  it('distinguishes directories from files', () => {
    const { lastFrame } = render(
      <SelectionPopup items={ITEMS} cursor={0} pageSize={10} title="t" hint="h" />,
    );
    const out = lastFrame() ?? '';
    expect(out).toContain('[D]');
    expect(out).toContain('[F]');
  });

  it('marks which row the cursor is on', () => {
    const first =
      render(
        <SelectionPopup items={ITEMS} cursor={0} pageSize={10} title="t" hint="h" />,
      ).lastFrame() ?? '';
    const second =
      render(
        <SelectionPopup items={ITEMS} cursor={1} pageSize={10} title="t" hint="h" />,
      ).lastFrame() ?? '';
    expect(first).not.toBe(second);
  });

  // absolute paths in a half-width pane are unreadable when wrapped; the tail
  // identifies the entry, so that is what must survive
  it('truncates a long path from the left, keeping the tag and the file name', () => {
    const long = `/${'deeply-nested-directory/'.repeat(10)}target.txt`;
    const { lastFrame } = render(
      <SelectionPopup
        items={[{ path: long, isDir: false, size: 1 }]}
        cursor={0}
        pageSize={10}
        title="t"
        hint="h"
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('[F]');
    expect(frame).toContain('target.txt');
    expect(frame).toContain('…');
  });
});
