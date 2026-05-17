import { useInput } from 'ink';

export interface Binding {
  key: string;
  alias?: string[];
  ctrl?: boolean;
  description: string;
  action: () => void;
}

export function useKeybindings(bindings: Binding[]): void {
  useInput((input, key) => {
    for (const b of bindings) {
      if (b.ctrl && !key.ctrl) continue;
      if (b.key === input || (b.alias?.includes(input) ?? false)) {
        b.action();
        return;
      }
      if (b.key === 'return' && key.return) {
        b.action();
        return;
      }
      if (b.key === 'escape' && key.escape) {
        b.action();
        return;
      }
    }
  });
}
