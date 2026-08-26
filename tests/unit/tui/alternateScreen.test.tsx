import { EventEmitter } from 'node:events';
import { render, Text } from 'ink';
import { describe, expect, it } from 'vitest';

/**
 * The app renders in the terminal's alternate screen buffer. If Ink ever
 * stopped emitting the restore sequence on teardown, quitting would strand the
 * user's terminal on a blank buffer needing a manual `reset` — so the exit
 * path is worth pinning down rather than trusting.
 */
const ENTER_ALT_SCREEN = '?1049h';
const LEAVE_ALT_SCREEN = '?1049l';

class RecordingStdout extends EventEmitter {
  columns = 100;
  rows = 30;
  isTTY = true;
  frames: string[] = [];

  write = (frame: string): boolean => {
    this.frames.push(frame);
    return true;
  };

  all(): string {
    return this.frames.join('');
  }
}

class InertStdin extends EventEmitter {
  isTTY = true;
  setEncoding() {}
  setRawMode() {}
  resume() {}
  pause() {}
  ref() {}
  unref() {}
  read() {
    return null;
  }
}

function renderAlt(alternateScreen: boolean) {
  const stdout = new RecordingStdout();
  const instance = render(<Text>hello</Text>, {
    stdout: stdout as unknown as NodeJS.WriteStream,
    stdin: new InertStdin() as unknown as NodeJS.ReadStream,
    patchConsole: false,
    interactive: true,
    exitOnCtrlC: false,
    alternateScreen,
  });
  return { stdout, instance };
}

describe('alternate screen lifecycle', () => {
  it('enters the alternate screen on mount and leaves it on unmount', () => {
    const { stdout, instance } = renderAlt(true);
    expect(stdout.all()).toContain(ENTER_ALT_SCREEN);

    instance.unmount();
    instance.cleanup();
    expect(stdout.all()).toContain(LEAVE_ALT_SCREEN);
  });

  // src/index.ts only awaits waitUntilExit(); it never calls cleanup(). If the
  // restore depended on cleanup(), quitting would leave the terminal stranded.
  it('restores the screen through the plain exit path, without cleanup()', async () => {
    const { stdout, instance } = renderAlt(true);
    instance.unmount();
    await instance.waitUntilExit();
    expect(stdout.all()).toContain(LEAVE_ALT_SCREEN);
    instance.cleanup();
  });

  it('does not touch the alternate screen when the option is off', () => {
    const { stdout, instance } = renderAlt(false);
    instance.unmount();
    instance.cleanup();
    expect(stdout.all()).not.toContain(ENTER_ALT_SCREEN);
    expect(stdout.all()).not.toContain(LEAVE_ALT_SCREEN);
  });
});
