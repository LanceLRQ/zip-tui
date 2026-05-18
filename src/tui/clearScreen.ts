export function clearScreen(stream: NodeJS.WriteStream = process.stdout): void {
  stream.write('\x1Bc');
}
