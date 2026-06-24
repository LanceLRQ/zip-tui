import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import { type SelectedItem, SelectedList } from '../../../src/tui/components/SelectedList';

const items: SelectedItem[] = [
  { path: '/aaa/Movies', isDir: true },
  { path: '/aaa/TV Shows', isDir: true },
  { path: '/aaa/avatar.jpg', isDir: false },
];

describe('SelectedList', () => {
  it('renders [D]/[F] prefixes with full paths', () => {
    const { lastFrame } = render(
      <SelectedList items={items} cursor={0} pageSize={10} focused={false} />,
    );
    const out = lastFrame() ?? '';
    expect(out).toContain('[D] /aaa/Movies');
    expect(out).toContain('[D] /aaa/TV Shows');
    expect(out).toContain('[F] /aaa/avatar.jpg');
  });

  it('windows the list to pageSize centered on the cursor', () => {
    const many: SelectedItem[] = Array.from({ length: 50 }, (_, i) => ({
      path: `/aaa/item-${i}`,
      isDir: false,
    }));
    const { lastFrame } = render(
      <SelectedList items={many} cursor={25} pageSize={5} focused={true} />,
    );
    const out = lastFrame() ?? '';
    expect(out).toContain('/aaa/item-25');
    expect(out).not.toContain('/aaa/item-0');
    expect(out).not.toContain('/aaa/item-49');
  });

  it('wraps long paths instead of truncating', () => {
    const long = `/aaa/${'x'.repeat(200)}/movie.mp4`;
    const { lastFrame } = render(
      <SelectedList
        items={[{ path: long, isDir: false }]}
        cursor={0}
        pageSize={10}
        focused={false}
      />,
    );
    expect(lastFrame() ?? '').toContain('movie.mp4');
  });
});
