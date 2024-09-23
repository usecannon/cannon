import { pickForgeBuildOptions, pickForgeTestOptions, pickAnvilOptions, fromFoundryOptionsToArgs } from './foundry-options';
import { forgeTestOptions } from '../commands/config/forge/test';
import { Option } from '../commands/config/types';

describe('Foundry Options Utilities', () => {
  describe('pickForgeBuildOptions', () => {
    it('should pick and normalize forge build options', () => {
      const options = {
        '--forge.viaIr': true,
        '--forge.optimize': true,
        '--forge.optimizerRuns': '200',
      };
      const result = pickForgeBuildOptions(options);

      expect(result).toEqual({
        viaIr: true,
        optimize: true,
        optimizerRuns: '200',
      });
    });
  });

  describe('pickForgeTestOptions', () => {
    it('should pick and normalize forge test options', () => {
      const options = {
        '--forge.fuzzRuns': '1000',
        '--forge.gasReport': true,
        '--invalidPption': 'value',
      };
      const result = pickForgeTestOptions(options);
      expect(result).toEqual({
        fuzzRuns: '1000',
        gasReport: true,
      });
    });
  });

  describe('pickAnvilOptions', () => {
    it('should pick and normalize anvil options', () => {
      const options = {
        '--anvil.port': '1234',
        '--anvil.blockTime': '5',
        '--invalidOption': 'value',
      };
      const result = pickAnvilOptions(options);
      expect(result).toEqual({
        port: '1234',
        blockTime: '5',
      });
    });
  });

  describe('fromFoundryOptionsToArgs', () => {
    it('should convert foundry options to command-line arguments', () => {
      const options = {
        'forge.fuzzRuns': '1000',
        'forge.gasReport': true,
        'forge.vv': true,
      };

      const result = fromFoundryOptionsToArgs(options, forgeTestOptions);

      expect(result).toEqual(['--fuzz-runs', '1000', '--gas-report', '-vv']);
    });

    it('should ignore invalid options', () => {
      const options = {
        'forge.optimize': true,
        'invalid.option': 'value',
      };
      const commandOptions: Option[] = [{ flags: 'optimize', description: 'Optimize' }];
      const result = fromFoundryOptionsToArgs(options, commandOptions);
      expect(result).toEqual(['--optimize']);
    });
  });
});
