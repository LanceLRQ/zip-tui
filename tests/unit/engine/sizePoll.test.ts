import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { startSizePoll } from '../../../src/engine/sizePoll';

describe('startSizePoll', () => {
  it('polls file size at interval', async () => {
    const tmp = path.join(os.tmpdir(), `zt-poll-${Date.now()}.bin`);
    fs.writeFileSync(tmp, Buffer.alloc(100));
    const events: number[] = [];
    const stop = startSizePoll(tmp, 30, (s) => events.push(s));
    await new Promise((r) => setTimeout(r, 100));
    fs.appendFileSync(tmp, Buffer.alloc(50));
    await new Promise((r) => setTimeout(r, 100));
    stop();
    expect(events[0]).toBe(100);
    expect(events.at(-1)).toBeGreaterThanOrEqual(100);
  });
});
