import action from './router';
import { fixtureContractData, fixtureCtx, fixtureRuntime } from '../../test/fixtures';

describe('steps/router.ts', () => {
  describe('configInject()', () => {
    it('injects all fields', async () => {
      const result = action.configInject(
        fixtureCtx({
          settings: { a: 'A', b: 'B', from: 'FROM', salt: 'SALT' },
        }),
        {
          contracts: ['<%= settings.a %>', '<%= settings.b %>'],
          from: '<%= settings.from %>',
          salt: '<%= settings.salt %>',
        }
      );

      expect(result).toStrictEqual({
        contracts: ['A', 'B'],
        from: 'FROM',
        salt: 'SALT',
      });
    });
  });

  describe('getState()', () => {
    it('resolves correct properties on state', async () => {
      const contracts = {
        GreeterOne: fixtureContractData('GreeterOne'),
        GreeterTwo: fixtureContractData('GreeterTwo'),
      };

      const runtime = fixtureRuntime();

      const ctx = fixtureCtx({ contracts });

      const config = {
        contracts: Object.keys(contracts),
      };

      const result = await action.getState(runtime, ctx, config);

      expect(result.contractAbis.GreeterOne).toStrictEqual(contracts.GreeterOne.abi);
      expect(result.contractAddresses.GreeterOne).toStrictEqual(contracts.GreeterOne.address);

      expect(result.contractAbis.GreeterTwo).toStrictEqual(contracts.GreeterTwo.abi);
      expect(result.contractAddresses.GreeterTwo).toStrictEqual(contracts.GreeterTwo.address);
    });
  });
});
