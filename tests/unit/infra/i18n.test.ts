import { beforeAll, describe, expect, it } from 'vitest';
import en from '../../../locales/en.json';
import zh from '../../../locales/zh.json';
import { changeLanguage, initI18n, t } from '../../../src/infra/i18n';

function flatKeys(obj: unknown, prefix = ''): string[] {
  if (typeof obj !== 'object' || obj === null) return [prefix];
  return Object.entries(obj).flatMap(([k, v]) => flatKeys(v, prefix ? `${prefix}.${k}` : k));
}

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

  it('keeps the zh and en key trees identical so nothing falls back silently', () => {
    expect(flatKeys(zh).sort()).toEqual(flatKeys(en).sort());
  });

  it('resolves view keys rather than echoing the key name back', () => {
    for (const key of ['view.loading', 'view.empty', 'view.failed', 'view.hint']) {
      expect(t(key)).not.toBe(key);
    }
    expect(t('view.itemCount', { total: 7, shown: 3 })).toContain('7');
  });
});
