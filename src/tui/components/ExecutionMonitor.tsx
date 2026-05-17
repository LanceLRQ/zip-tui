import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import type React from 'react';
import type { Progress } from '../../engine/types.js';
import type { ExecState } from '../../store/executionSlice.js';

export interface ExecutionMonitorProps {
  state: ExecState;
  progress: Progress | null;
  stderrTail: string[];
  elapsedMs: number;
}

export const ExecutionMonitor: React.FC<ExecutionMonitorProps> = ({
  state,
  progress,
  stderrTail,
  elapsedMs,
}) => {
  const seconds = (elapsedMs / 1000).toFixed(1);

  return (
    <Box flexDirection="column">
      <Box>
        {state === 'running' && <Spinner type="dots" />}
        <Text> </Text>
        {state === 'running' && progress && (
          <Text>
            {progress.current}% of {progress.total}%
          </Text>
        )}
        {state === 'running' && !progress && <Text>{seconds}s elapsed</Text>}
        {state === 'success' && <Text color="green">SUCCESS ({seconds}s)</Text>}
        {state === 'failed' && <Text color="red">FAILED ({seconds}s)</Text>}
        {state === 'cancelled' && <Text color="yellow">CANCELLED</Text>}
      </Box>
      <Box flexDirection="column" marginTop={1}>
        {stderrTail.slice(-5).map((line) => (
          <Text key={line} dimColor>
            {line}
          </Text>
        ))}
      </Box>
    </Box>
  );
};
