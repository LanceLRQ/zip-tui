import { beforeAll, describe, expect, it } from 'vitest';
import { changeLanguage, initI18n, t } from '../../../src/infra/i18n';

describe('i18n', () => {
  beforeAll(async () => {
    await initI18n('zh');
  });

  it('returns zh string by key', () => {
    expect(t('menu.create')).toBe('压缩文件');
  });

  it('returns existing zh key', () => {
    expect(t('common.copy')).toBe('复制');
  });

  it('changeLanguage switches active locale', async () => {
    await changeLanguage('en');
    expect(t('menu.create')).toBe('Compress');
    await changeLanguage('zh');
    expect(t('menu.create')).toBe('压缩文件');
  });
});
