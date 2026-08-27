import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import { AddressBar } from '../../../src/tui/components/AddressBar';

describe('AddressBar', () => {
  it('marks a filesystem location with the folder icon', () => {
    const { lastFrame } = render(<AddressBar kind="fs" label="/w/proj" />);
    const out = lastFrame() ?? '';
    expect(out).toContain('📂');
    expect(out).toContain('/w/proj');
  });

  it('marks an archive location with the package icon', () => {
    const { lastFrame } = render(<AddressBar kind="archive" label="/w/a.zip › app" />);
    const out = lastFrame() ?? '';
    expect(out).toContain('📦');
    expect(out).toContain('app');
  });

  it('shows the marked count when there is one', () => {
    const { lastFrame } = render(<AddressBar kind="fs" label="/w" countLabel="3 已选" />);
    expect(lastFrame() ?? '').toContain('3 已选');
  });

  it('omits the count entirely when nothing is marked', () => {
    const { lastFrame } = render(<AddressBar kind="fs" label="/w" />);
    expect(lastFrame() ?? '').not.toContain('已选');
  });

  // the icon is the only signal for which kind of location this is, so it must
  // outlive the path text when space runs out
  it('truncates the path from the left, keeping the icon and the deepest segment', () => {
    const deep = `/${'very-long-directory-name/'.repeat(12)}leaf`;
    const { lastFrame } = render(<AddressBar kind="archive" label={deep} />);
    const frame = lastFrame() ?? '';

    // a broken layout would wrap instead of truncating, and the two assertions
    // below would both still pass — so pin the single line first
    expect(frame.replace(/\n$/, '').split('\n')).toHaveLength(1);
    // the ellipsis proves truncation actually happened rather than the string
    // merely fitting
    expect(frame).toContain('…');
    expect(frame).toContain('📦');
    expect(frame).toContain('leaf');
  });
});
