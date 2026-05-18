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

  it('renders step 0 with a format selector', () => {
    const { lastFrame } = render(<CreateWizard />);
    const out = lastFrame() ?? '';
    expect(out).toContain('1/5 format');
    expect(out).toContain('zip');
    expect(out).toContain('7z');
    expect(out).toContain('tar.gz');
  });

  it('defaults wizard.format to 7z', () => {
    expect(useAppStore.getState().wizard.format).toBe('7z');
  });

  it('step 1 saveFile picker default filename tracks the chosen format', () => {
    const s = useAppStore.getState();
    s.wizard.setFormat('zip');
    s.wizard.next();
    const { lastFrame } = render(<CreateWizard />);
    const out = lastFrame() ?? '';
    expect(out).toContain('保存为');
    expect(out).toContain('archive.zip');
    expect(out).toContain('仅显示归档文件');
  });
});
