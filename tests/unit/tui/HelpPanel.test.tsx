import { render } from 'ink-testing-library';
import { beforeAll, describe, expect, it } from 'vitest';
import { initI18n } from '../../../src/infra/i18n';
import { HelpPanel } from '../../../src/tui/components/HelpPanel';

describe('HelpPanel', () => {
  beforeAll(async () => {
    await initI18n('zh');
  });

  it('lists every key group', () => {
    const { lastFrame } = render(<HelpPanel cursor={0} />);
    const out = lastFrame() ?? '';
    for (const group of ['导航', '选择', '动作', '视图']) {
      expect(out).toContain(group);
    }
  });

  // these two lost their top-level menu entry, so this is their only way in
  it('offers the dependency and settings entries', () => {
    const { lastFrame } = render(<HelpPanel cursor={0} />);
    expect(lastFrame() ?? '').toContain('依赖检测');
    expect(lastFrame() ?? '').toContain('配置');
  });

  it('highlights whichever entry the cursor is on', () => {
    const first = render(<HelpPanel cursor={0} />).lastFrame() ?? '';
    const second = render(<HelpPanel cursor={1} />).lastFrame() ?? '';
    expect(first).not.toBe(second);
  });

  // a panel you cannot dismiss is a trap
  it('says how to close', () => {
    expect(render(<HelpPanel cursor={0} />).lastFrame() ?? '').toContain('Esc');
  });

  // the whole point is to be readable; a truncated key list helps nobody
  it('shows a long key list in full rather than cutting it off', () => {
    const out = render(<HelpPanel cursor={0} />).lastFrame() ?? '';
    // the navigation group is the longest line in the panel
    expect(out).toContain('PgUp/PgDn');
    expect(out).toContain('当前目录');
  });
});
