export function formatCommandHelp(inputText: string): string {
  const lines = inputText.split('\n');
  const optionGroups = [
    { prefix: '--anvil.', header: 'Anvil Options:' },
    { prefix: '--forge.', header: 'Forge Options:' },
  ];

  const result: string[] = [];
  let helpLine: string | null = null;
  let lastMainOptionIndex = -1;

  lines.forEach((line) => {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith('-h, --help')) {
      helpLine = line;
      return;
    }

    const group = optionGroups.find((g) => trimmedLine.startsWith(g.prefix));
    if (group) {
      if (!result.includes(group.header)) {
        result.push('', group.header);
      }
    } else if (trimmedLine.startsWith('-')) {
      lastMainOptionIndex = result.length;
    }

    result.push(line);
  });

  if (helpLine) {
    result.splice(lastMainOptionIndex + 1, 0, helpLine);
  }

  return result.join('\n');
}
