import fs from 'node:fs';

export function startSizePoll(
  target: string,
  intervalMs: number,
  onSize: (bytes: number) => void,
): () => void {
  const timer = setInterval(() => {
    try {
      const stat = fs.statSync(target);
      onSize(stat.size);
    } catch {
      onSize(0);
    }
  }, intervalMs);
  return () => clearInterval(timer);
}
