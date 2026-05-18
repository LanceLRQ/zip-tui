import { render } from 'ink-testing-library';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initI18n } from '../../../src/infra/i18n';
import { useAppStore } from '../../../src/store/index';
import { CreateWizard } from '../../../src/tui/pages/CreateWizard';

describe('CreateWizard', () => {
  beforeAll(async () => {
    await initI18n('zh');
  });
  beforeEach(() => {
    useAppStore.getState().wizard.reset();
  });

  it('renders step 0 with a saveFile picker default to archive.7z', () => {
    const { lastFrame } = render(<CreateWizard />);
    const out = lastFrame() ?? '';
    expect(out).toContain('保存为');
    expect(out).toContain('archive.7z');
  });

  it('defaults wizard.format to 7z so step 2 starts aligned', () => {
    expect(useAppStore.getState().wizard.format).toBe('7z');
  });
});
