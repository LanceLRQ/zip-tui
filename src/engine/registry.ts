import type { FormatAdapter, FormatId } from './types.js';

export interface FormatRegistry {
  register(adapter: FormatAdapter): void;
  get(id: FormatId): FormatAdapter;
  list(): FormatId[];
}

export function createRegistry(): FormatRegistry {
  const adapters = new Map<FormatId, FormatAdapter>();
  return {
    register(adapter) {
      if (adapters.has(adapter.id)) {
        throw new Error(`duplicate adapter id: ${adapter.id}`);
      }
      adapters.set(adapter.id, adapter);
    },
    get(id) {
      const a = adapters.get(id);
      if (!a) throw new Error(`adapter not registered: ${id}`);
      return a;
    },
    list() {
      return [...adapters.keys()];
    },
  };
}
