import { useStdout } from 'ink';
import { useEffect, useState } from 'react';

/**
 * Current terminal height, re-rendering on resize.
 *
 * Deliberately not Ink's `useWindowSize`: when `stdout.rows` is absent — which
 * is the case for piped output and for test stubs — that hook falls back to the
 * `terminal-size` package, which shells out via `execFileSync`. A synchronous
 * subprocess on every mount is far too costly for a layout measurement, and
 * under a loaded test suite it is slow enough to blow past timeouts.
 *
 * Returns 0 when the height is unknown; callers treat that as "not a real
 * terminal" and fall back to a fixed size.
 */
export function useTerminalRows(): number {
  const { stdout } = useStdout();
  const [rows, setRows] = useState(() => stdout?.rows ?? 0);

  useEffect(() => {
    if (!stdout) return;
    const onResize = () => setRows(stdout.rows ?? 0);
    stdout.on('resize', onResize);
    return () => {
      stdout.off('resize', onResize);
    };
  }, [stdout]);

  return rows;
}
