import { formatCommandHelp } from './format-command-help';

describe('formatCommandHelp', () => {
  it('should group Anvil options', () => {
    const input = `
      --option1 Description1
      --anvil.option1 AnvilDescription1
      --anvil.option2 AnvilDescription2
      --option2 Description2
    `;
    const result = formatCommandHelp(input);
    expect(result).toContain('Anvil Options:');
    expect(result.indexOf('--anvil.option1')).toBeGreaterThan(result.indexOf('Anvil Options:'));
    expect(result.indexOf('--anvil.option2')).toBeGreaterThan(result.indexOf('Anvil Options:'));
  });

  it('should group Forge options', () => {
    const input = `
      --option1 Description1
      --forge.option1 ForgeDescription1
      --forge.option2 ForgeDescription2
      --option2 Description2
    `;
    const result = formatCommandHelp(input);
    expect(result).toContain('Forge Options:');
    expect(result.indexOf('--forge.option1')).toBeGreaterThan(result.indexOf('Forge Options:'));
    expect(result.indexOf('--forge.option2')).toBeGreaterThan(result.indexOf('Forge Options:'));
  });

  it('should place help option after the last main option', () => {
    const input = `
      --option1 Description1
      --option2 Description2
      --anvil.option1 AnvilDescription1
      -h, --help Show help
    `;
    const result = formatCommandHelp(input);
    const helpIndex = result.indexOf('-h, --help');
    const option2Index = result.indexOf('--option2');
    const anvilOptionIndex = result.indexOf('--anvil.option1');
    expect(helpIndex).toBeGreaterThan(option2Index);
    expect(helpIndex).toBeLessThan(anvilOptionIndex);
  });

  it('should handle input with no special options', () => {
    const input = `
      --option1 Description1
      --option2 Description2
    `;
    const result = formatCommandHelp(input);
    expect(result).toBe(input);
  });
});
