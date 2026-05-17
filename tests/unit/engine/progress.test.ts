import { describe, expect, it } from 'vitest';
import { sevenzAdapter } from '../../../src/engine/adapters/sevenz';
import { createProgressTracker } from '../../../src/engine/progress';

describe('createProgressTracker', () => {
  it('emits progress events from 7z output', () => {
    const events: number[] = [];
    const tracker = createProgressTracker(sevenzAdapter, (p) => events.push(p.current));
    tracker.feed('  10% - file.txt\n');
    tracker.feed('  42% - other.bin\n');
    expect(events).toEqual([10, 42]);
  });

  it('ignores lines without progress', () => {
    const events: number[] = [];
    const tracker = createProgressTracker(sevenzAdapter, (p) => events.push(p.current));
    tracker.feed('Scanning ...\n');
    expect(events).toEqual([]);
  });
});
