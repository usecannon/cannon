import { fixtureContractData, fixtureCtx, fixtureSigner, fixtureTransactionReceipt } from '../../test/fixtures';
import action from './router';
import { fakeRuntime } from './utils.test.helper';

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

      const runtime = fakeRuntime;

      const ctx = fixtureCtx({ contracts });

      const config = {
        contracts: Object.keys(contracts),
      };

      const result = await action.getState(runtime, ctx, config);

      expect(result[0].contractAbis.GreeterOne).toStrictEqual(contracts.GreeterOne.abi);
      expect(result[0].contractAddresses.GreeterOne).toStrictEqual(contracts.GreeterOne.address);

      expect(result[0].contractAbis.GreeterTwo).toStrictEqual(contracts.GreeterTwo.abi);
      expect(result[0].contractAddresses.GreeterTwo).toStrictEqual(contracts.GreeterTwo.address);
    });
  });

  describe('exec()', () => {
    it('throws an error on missing contract file', async () => {
      const contracts = { Greeter: fixtureContractData('Greeter') };
      const step = {
        name: 'router-test',
        version: '0.0.0',
        currentLabel: 'router.Router',
      };

      const runtime = fakeRuntime;
      const ctx = fixtureCtx({}); // generate a ctx without the contracts
      const config = { contracts: Object.keys(contracts) };

      await expect(action.exec(runtime, ctx, config, step)).rejects.toThrow('contract not found: Greeter');
    });

    it('generates and deploys Router with a single contract', async () => {
      const signer = fixtureSigner();
      const contracts = { Greeter: fixtureContractData('Greeter') };

      const step = {
        name: 'router-test',
        version: '0.0.0',
        currentLabel: 'router.Router',
      };

      const runtime = fakeRuntime;
      const ctx = fixtureCtx({ contracts });
      const config = { from: await signer.address, contracts: Object.keys(contracts) };

      (runtime as any).getSigner = jest.fn();
      jest.mocked(runtime.getSigner).mockResolvedValue(signer);
      jest.mocked(signer.wallet.sendTransaction).mockResolvedValue('0x8484');

      const rx = fixtureTransactionReceipt();

      jest.mocked(runtime.provider.waitForTransactionReceipt).mockResolvedValue(rx);

      const res = await action.exec(runtime, ctx, config, step);

      expect(fakeRuntime.provider.waitForTransactionReceipt).toHaveBeenCalledTimes(1);

      expect(res.contracts).toMatchObject({
        Router: {
          address: rx.contractAddress,
          abi: contracts.Greeter.abi,
          deployedOn: step.currentLabel,
          deployTxnHash: rx.transactionHash,
          contractName: 'Router',
          sourceName: 'Router.sol',
          gasCost: rx.effectiveGasPrice.toString(),
          gasUsed: Number(rx.gasUsed.toString()),
        },
      });
    });
  });
});
