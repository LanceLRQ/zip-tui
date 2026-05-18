import { describe, expect, it, vi } from 'vitest';
import { clearScreen } from '../../../src/tui/clearScreen';

describe('clearScreen', () => {
  it('writes ESC c to the given stream', () => {
    const write = vi.fn();
    clearScreen({ write } as unknown as NodeJS.WriteStream);
    expect(write).toHaveBeenCalledWith('\x1Bc');
  });

  it('defaults to process.stdout', () => {
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    try {
      clearScreen();
      expect(spy).toHaveBeenCalledWith('\x1Bc');
    } finally {
      spy.mockRestore();
    }
  });
});
