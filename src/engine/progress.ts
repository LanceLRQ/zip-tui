import type { FormatAdapter, Progress } from './types.js';

export interface ProgressTracker {
  feed(chunk: string): void;
}

export function createProgressTracker(
  adapter: FormatAdapter,
  onProgress: (p: Progress) => void,
): ProgressTracker {
  let buf = '';
  return {
    feed(chunk) {
      buf += chunk;
      let idx = buf.indexOf('\n');
      while (idx !== -1) {
        const line = buf.slice(0, idx);
        buf = buf.slice(idx + 1);
        const p = adapter.parseProgress?.(line);
        if (p) onProgress(p);
        idx = buf.indexOf('\n');
      }
    },
  };
}
