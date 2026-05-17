import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import { ExecutionMonitor } from '../../../src/tui/components/ExecutionMonitor';

describe('ExecutionMonitor', () => {
  it('renders spinner when running with no progress', () => {
    const { lastFrame } = render(
      <ExecutionMonitor state="running" progress={null} stderrTail={[]} elapsedMs={1234} />,
    );
    expect(lastFrame()).toContain('1.2s');
  });

  it('renders percent when progress available', () => {
    const { lastFrame } = render(
      <ExecutionMonitor
        state="running"
        progress={{ current: 42, total: 100 }}
        stderrTail={[]}
        elapsedMs={500}
      />,
    );
    expect(lastFrame()).toContain('42%');
  });

  it('renders success on exit 0', () => {
    const { lastFrame } = render(
      <ExecutionMonitor state="success" progress={null} stderrTail={[]} elapsedMs={2000} />,
    );
    expect(lastFrame()).toContain('SUCCESS');
  });

  it('renders failed state', () => {
    const { lastFrame } = render(
      <ExecutionMonitor state="failed" progress={null} stderrTail={[]} elapsedMs={500} />,
    );
    expect(lastFrame()).toContain('FAILED');
  });

  it('renders cancelled state', () => {
    const { lastFrame } = render(
      <ExecutionMonitor state="cancelled" progress={null} stderrTail={[]} elapsedMs={500} />,
    );
    expect(lastFrame()).toContain('CANCELLED');
  });

  it('renders last stderr lines', () => {
    const { lastFrame } = render(
      <ExecutionMonitor
        state="running"
        progress={null}
        stderrTail={['hello', 'world']}
        elapsedMs={0}
      />,
    );
    expect(lastFrame()).toContain('hello');
    expect(lastFrame()).toContain('world');
  });
});
