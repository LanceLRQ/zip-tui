import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import en from '../../../locales/en.json';
import zh from '../../../locales/zh.json';
import { changeLanguage, initI18n, t } from '../../../src/infra/i18n';

function flatKeys(obj: unknown, prefix = ''): string[] {
  if (typeof obj !== 'object' || obj === null) return [prefix];
  return Object.entries(obj).flatMap(([k, v]) => flatKeys(v, prefix ? `${prefix}.${k}` : k));
}

const SRC = path.resolve(__dirname, '../../../src');

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(e.name) ? [full] : [];
  });
}

/**
 * Every `'section.name'` literal in the source whose section is a real locale
 * section. Restricting by section is what keeps unrelated dotted strings — file
 * extensions like `tar.gz`, property paths like `location.kind` — out.
 */
function referencedKeys(): Set<string> {
  const sections = new Set(Object.keys(zh));
  const found = new Set<string>();
  for (const file of sourceFiles(SRC)) {
    for (const m of fs.readFileSync(file, 'utf8').matchAll(/['"`]([a-z]+\.[a-zA-Z]+)['"`]/g)) {
      const key = m[1];
      if (key && sections.has(key.split('.')[0] ?? '')) found.add(key);
    }
  }
  return found;
}

describe('i18n', () => {
  beforeAll(async () => {
    await initI18n('zh');
  });

  it('returns zh string by key', () => {
    expect(t('browser.empty')).toBe('空目录');
  });

  it('changeLanguage switches active locale', async () => {
    await changeLanguage('en');
    expect(t('browser.empty')).toBe('Empty directory');
    await changeLanguage('zh');
    expect(t('browser.empty')).toBe('空目录');
  });

  it('keeps the zh and en key trees identical so nothing falls back silently', () => {
    expect(flatKeys(zh).sort()).toEqual(flatKeys(en).sort());
  });

  /**
   * Guards the direction the other cases do not: a key that the source still
   * asks for but the locale no longer has. i18next answers such a call with the
   * key itself, so the screen reads `browser.empty` instead of a sentence — no
   * type error, no crash, and nothing else here would notice.
   *
   * This exists because pruning the locales after the wizard pages were deleted
   * came within one key of removing `help.deps`, which only survives in the
   * source as a template literal that a plain search for the whole key misses.
   */
  it('has a translation for every key the source asks for', () => {
    const keys = referencedKeys();
    // built as `help.${entry}` from HELP_ENTRIES, so no whole-key literal exists
    for (const entry of ['deps', 'settings']) keys.add(`help.${entry}`);
    expect(keys.size).toBeGreaterThan(20);
    for (const key of [...keys].sort()) {
      expect(t(key), `${key} is referenced in src but missing from the locale`).not.toBe(key);
    }
  });

  it('interpolates counts rather than printing the placeholder', () => {
    expect(t('browser.itemCount', { total: 7, shown: 3 })).toContain('7');
  });
});
