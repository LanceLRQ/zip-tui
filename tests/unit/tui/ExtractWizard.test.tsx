import { render } from 'ink-testing-library';
import { beforeAll, describe, expect, it } from 'vitest';
import { initI18n } from '../../../src/infra/i18n';
import { ExtractWizard } from '../../../src/tui/pages/ExtractWizard';

describe('ExtractWizard', () => {
  beforeAll(async () => {
    await initI18n('zh');
  });

  it('renders an openFile picker for the archive step', () => {
    const { lastFrame } = render(<ExtractWizard />);
    const out = lastFrame() ?? '';
    expect(out).toContain('选择文件');
    expect(out).toContain('仅显示归档文件');
  });
});
