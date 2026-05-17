import { render } from 'ink-testing-library';
import { beforeAll, describe, expect, it } from 'vitest';
import { initI18n } from '../../../src/infra/i18n';
import { MainMenu } from '../../../src/tui/pages/MainMenu';

describe('MainMenu', () => {
  beforeAll(async () => {
    await initI18n('zh');
  });

  it('renders all menu items', () => {
    const { lastFrame } = render(<MainMenu />);
    const out = lastFrame() ?? '';
    expect(out).toContain('压缩文件');
    expect(out).toContain('解压文件');
    expect(out).toContain('查看压缩包');
    expect(out).toContain('依赖管理');
    expect(out).toContain('设置');
    expect(out).toContain('退出');
  });
});
