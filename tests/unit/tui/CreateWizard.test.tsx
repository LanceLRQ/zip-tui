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

  it('renders step 0 with 9 formats ordered 7z, zip, tar.gz, ... gz, bz2', () => {
    const { lastFrame } = render(<CreateWizard />);
    const out = lastFrame() ?? '';
    expect(out).toContain('1/5 format');
    for (const label of [
      '7z',
      'zip',
      'tar.gz',
      'tar.bz2',
      'tar.xz',
      'tar.zst',
      'tar',
      'gz (single file)',
      'bz2 (single file)',
    ]) {
      expect(out).toContain(label);
    }
    const i7z = out.indexOf('7z');
    const iZip = out.indexOf('zip');
    const iTarGz = out.indexOf('tar.gz');
    expect(i7z).toBeLessThan(iZip);
    expect(iZip).toBeLessThan(iTarGz);
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

  it('step 2 uses single-file picker for gz format', () => {
    const s = useAppStore.getState();
    s.wizard.setFormat('gz');
    s.wizard.next();
    s.wizard.next();
    const { lastFrame } = render(<CreateWizard />);
    const out = lastFrame() ?? '';
    expect(out).toContain('仅可选 1 个文件');
    expect(out).toContain('选择文件');
    expect(out).not.toContain('选择文件（可多选）');
  });

  it('step 2 uses multiSelect picker for tar.gz format', () => {
    const s = useAppStore.getState();
    s.wizard.setFormat('tar.gz');
    s.wizard.next();
    s.wizard.next();
    const { lastFrame } = render(<CreateWizard />);
    const out = lastFrame() ?? '';
    expect(out).toContain('选择文件（可多选）');
    expect(out).not.toContain('仅可选 1 个文件');
  });
});
