import cli from './index';

describe('cli test', () => {
  it('help prints not empty', () => {
    expect(cli.helpInformation()).not.toBe('');
  });

  it('command name is cannon', () => {
    expect(cli.name()).toBe('cannon');
  });

  it('throws error missing required argument', async () => {
    cli.exitOverride((err) => {
      throw err;
    });
    expect(() => cli.parse([])).toThrow("error: missing required argument 'packageNames'");
  });
});
