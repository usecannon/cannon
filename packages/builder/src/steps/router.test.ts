import { fixtureContractData, fixtureCtx, fixtureSigner, fixtureTransactionReceipt } from '../../test/fixtures';
import { validateConfig } from '../actions';
import action from './router';
import { PackageReference } from '../package-reference';
import { fakeRuntime } from './utils.test.helper';
import * as create2Module from '../create2';

jest.mock('../create2', () => ({
  ...jest.requireActual('../create2'),
  ensureArachnidCreate2Exists: jest.fn(),
}));

describe('steps/router.ts', () => {
  describe('validate', () => {
    it('fails when not setting values', () => {
      expect(() => validateConfig(action.validate, {})).toThrow('Field: contracts');
    });

    it('fails when setting invalid value', () => {
      expect(() => validateConfig(action.validate, { contracts: [], invalid: ['something'] })).toThrow(
        "Unrecognized key(s) in object: 'invalid'"
      );
    });
  });

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
        includeDiamondCompatibility: true,
        salt: 'SALT',
      });
    });
  });

  describe('exec()', () => {
    it('throws an error on missing contract file', async () => {
      const contracts = { Greeter: fixtureContractData('Greeter') };
      const step = {
        ref: new PackageReference('router-test:0.0.0'),
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
        ref: new PackageReference('router-test:0.0.0'),
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
      jest.mocked(runtime.provider.getBlock).mockResolvedValue({ timestamp: BigInt(123444) } as any);

      const res = await action.exec(runtime, ctx, config, step);

      expect(fakeRuntime.provider.waitForTransactionReceipt).toHaveBeenCalledTimes(1);

      expect(res.contracts).toMatchObject({
        Router: {
          address: rx.contractAddress,
          abi: contracts.Greeter.abi,
          deployedOn: step.currentLabel,
          deployTxnHash: rx.transactionHash,
          deployTxnBlockNumber: '0',
          deployTimestamp: '123444',
          contractName: 'Router',
          sourceName: 'Router.sol',
          gasCost: rx.effectiveGasPrice.toString(),
          gasUsed: Number(rx.gasUsed.toString()),
        },
      });
    });

    it('generates and deploys Router with create2', async () => {
      const signer = fixtureSigner();
      const contracts = { Greeter: fixtureContractData('Greeter') };

      const step = {
        ref: new PackageReference('router-test:0.0.0'),
        currentLabel: 'router.Router',
      };

      const runtime = fakeRuntime;
      const ctx = fixtureCtx({ contracts });
      const config = { from: await signer.address, contracts: Object.keys(contracts), create2: true, salt: 'is.salty' };

      (runtime as any).getSigner = jest.fn();
      jest.mocked(runtime.getSigner).mockResolvedValue(signer);
      jest.mocked(signer.wallet.sendTransaction).mockResolvedValue('0x8484');

      // Mock ensureArachnidCreate2Exists to return the deployer address without actually deploying
      jest
        .mocked(create2Module.ensureArachnidCreate2Exists)
        .mockResolvedValue(create2Module.ARACHNID_DEFAULT_DEPLOY_ADDR as any);

      jest.mocked(runtime.provider.getCode).mockResolvedValue('0x');

      const rx = fixtureTransactionReceipt();

      jest.mocked(runtime.provider.waitForTransactionReceipt).mockResolvedValue(rx);
      jest.mocked(runtime.provider.getBlock).mockResolvedValue({ timestamp: BigInt(123444) } as any);

      const res = await action.exec(runtime, ctx, config, step);

      expect(fakeRuntime.provider.waitForTransactionReceipt).toHaveBeenCalledTimes(1);

      expect(res.contracts).toMatchObject({
        Router: {
          abi: contracts.Greeter.abi,
          deployedOn: step.currentLabel,
          deployTxnHash: rx.transactionHash,
          deployTxnBlockNumber: '0',
          deployTimestamp: '123444',
          contractName: 'Router',
          sourceName: 'Router.sol',
          gasCost: rx.effectiveGasPrice.toString(),
          gasUsed: Number(rx.gasUsed.toString()),
        },
      });
    });

    it('continues when create2 contract already exists with ifExists', async () => {
      const signer = fixtureSigner();
      const contracts = { Greeter: fixtureContractData('Greeter') };
      const runtime = fakeRuntime;
      const ctx = fixtureCtx({ contracts });
      const step = {
        ref: new PackageReference('router-test:0.0.0'),
        currentLabel: 'router.Router',
      };

      // Mock ensureArachnidCreate2Exists to return the deployer address
      jest
        .mocked(create2Module.ensureArachnidCreate2Exists)
        .mockResolvedValue(create2Module.ARACHNID_DEFAULT_DEPLOY_ADDR as any);

      jest.mocked(runtime.provider.getCode).mockResolvedValue('0x60806040'); // Contract exists

      const config = {
        contracts: ['Greeter'],
        create2: true,
        salt: 'test-salt',
        ifExists: 'continue' as const,
      };

      const res = await action.exec(runtime, ctx, config, step);

      // Should not deploy
      expect(signer.wallet.sendTransaction).not.toHaveBeenCalled();
      // But should still return contract info
      expect(res.contracts.Router).toBeDefined();
      expect(res.contracts.Router.gasUsed).toBe(0);
    });

    it('throws error when create2 contract exists without ifExists', async () => {
      const runtime = fakeRuntime;
      const contracts = { Greeter: fixtureContractData('Greeter') };
      const ctx = fixtureCtx({ contracts });
      const step = {
        ref: new PackageReference('router-test:0.0.0'),
        currentLabel: 'router.Router',
      };

      // Mock ensureArachnidCreate2Exists to return the deployer address
      jest
        .mocked(create2Module.ensureArachnidCreate2Exists)
        .mockResolvedValue(create2Module.ARACHNID_DEFAULT_DEPLOY_ADDR as any);

      jest.mocked(runtime.provider.getCode).mockResolvedValue('0x60806040');

      await expect(
        action.exec(
          runtime,
          ctx,
          {
            contracts: ['Greeter'],
            create2: true,
          },
          step
        )
      ).rejects.toThrow('The contract at the create2 destination');
    });

    it('uses custom create2 deployer address', async () => {
      const signer = fixtureSigner();
      const customDeployer = '0x1234567890123456789012345678901234567890';
      const config = {
        from: await signer.address,
        contracts: ['Greeter'],
        create2: customDeployer,
        salt: 'test',
      };

      const runtime = fakeRuntime;
      const contracts = { Greeter: fixtureContractData('Greeter') };
      const ctx = fixtureCtx({ contracts });
      const step = {
        ref: new PackageReference('router-test:0.0.0'),
        currentLabel: 'router.Router',
      };

      (runtime as any).getSigner = jest.fn();
      jest.mocked(runtime.getSigner).mockResolvedValue(signer);
      jest.mocked(signer.wallet.sendTransaction).mockResolvedValue('0x8484');

      // Mock ensureArachnidCreate2Exists to return the custom deployer address
      jest.mocked(create2Module.ensureArachnidCreate2Exists).mockResolvedValue(customDeployer as any);

      jest.mocked(runtime.provider.getCode).mockResolvedValue('0x');

      const rx = fixtureTransactionReceipt();
      jest.mocked(runtime.provider.waitForTransactionReceipt).mockResolvedValue(rx);
      jest.mocked(runtime.provider.getBlock).mockResolvedValue({ timestamp: BigInt(123444) } as any);

      await action.exec(runtime, ctx, config, step);

      // Verify ensureArachnidCreate2Exists was called with custom address
      expect(create2Module.ensureArachnidCreate2Exists).toHaveBeenCalledWith(runtime, customDeployer);
    });
  });
});
