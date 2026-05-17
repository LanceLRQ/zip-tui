import { t as translate } from '../../infra/i18n.js';

export function useT(): (key: string, params?: Record<string, unknown>) => string {
  return translate;
}
