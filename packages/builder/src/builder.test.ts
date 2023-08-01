import _ from 'lodash';

import { ethers } from 'ethers';
import { ChainDefinition } from './definition';
import { RawChainDefinition } from './actions';
import { CannonWrapperGenericProvider } from './error/provider';
import { build, getOutputs, runStep, createInitialContext } from './builder';
import { IPFSLoader } from './loader';
import { BUILD_VERSION } from './constants';

import { ChainBuilderRuntime, Events } from './runtime';
import { ChainBuilderContext, ContractArtifact, DeploymentState } from './types';

import contractStep from './steps/contract';
import invokeStep from './steps/invoke';
import { InMemoryRegistry } from './registry';

jest.mock('./error/provider');
jest.mock('./steps/contract');
jest.mock('./steps/invoke');

describe('builder.ts', () => {
  const loader = new IPFSLoader('', null as any);

  const getSigner = jest.fn(async () => {
    return ethers.Wallet.createRandom();
  });

  const getDefaultSigner = jest.fn(async () => {
    return ethers.Wallet.createRandom();
  });

  const getArtifact = jest.fn(
    async (n: string): Promise<ContractArtifact> => {
      return {
        contractName: n,
        sourceName: `${n}.sol`,
        abi: [],
        bytecode: '0x',
        deployedBytecode: '0x',
        linkReferences: {}
      };
    }
  );

  const provider = new CannonWrapperGenericProvider({}, new ethers.providers.JsonRpcProvider());

  jest.mocked(provider.getNetwork).mockResolvedValue({ chainId: 1234, name: 'dummy' });
  jest.mocked(provider.send).mockImplementation(async (name: string) => {
    if (name.endsWith('_dumpState')) {
      return '0xfoobar';
    }
  });

  const runtime = new ChainBuilderRuntime(
    {
      allowPartialDeploy: true,
      provider,
      chainId: 1234,
      publicSourceCode: true,
      snapshots: false,
      getSigner,
      getDefaultSigner,
      getArtifact
    },
    new InMemoryRegistry(),
    { ipfs: loader }
  );

  const fakeDefinition: RawChainDefinition = {
    name: 'superDuper',
    version: '0.1.0',
    setting: {
      foo: { defaultValue: 'bar' },
      baz: {}
    },
    contract: {
      Yoop: {
        artifact: 'Wohoo'
      }
    },
    invoke: {
      smartFunc: {
        func: 'smartFunc',
        args: [1, 2, 3, '<%= contracts.Yoop.address %>'],
        from: '0x1234123412341234123412341234123412341234',
        depends: ['contract.Yoop']
      }
    }
  } as RawChainDefinition;

  const expectedStateOut: DeploymentState = {
    'contract.Yoop': {
      artifacts: {
        contracts: {
          Yoop: {
            address: '0x0987098709870987098709870987098709870987',
            deployTxnHash: '0x1234',
            sourceName: 'Wohoo.sol',
            contractName: 'Wohoo',
            abi: [],
            deployedOn: 'contract.Yoop'
          }
        }
      },
      version: BUILD_VERSION,
      hash: '12341234',
      chainDump: '0x1234'
    },
    'invoke.smartFunc': {
      artifacts: {
        txns: {
          smartFunc: {
            hash: '',
            events: {},
            deployedOn: 'invoke.smartFunc'
          }
        }
      },
      version: BUILD_VERSION,
      hash: '56786789',
      chainDump: '0x5678'
    }
  };

  let initialCtx: ChainBuilderContext;

  jest.mocked(contractStep.getState).mockResolvedValue({} as any);

  jest.mocked(contractStep.exec).mockResolvedValue({
    contracts: {
      Yoop: {
        address: '0x0987098709870987098709870987098709870987',
        deployTxnHash: '0x1234',
        sourceName: 'Wohoo.sol',
        contractName: 'Wohoo',
        abi: [],
        deployedOn: 'contract.Yoop'
      }
    }
  });

  jest.mocked(invokeStep.getState).mockResolvedValue({} as any);
  jest.mocked(invokeStep.exec).mockResolvedValue({
    txns: { smartFunc: { hash: '0x56785678', events: {}, deployedOn: 'invoke.smartFunc' } }
  });

  describe('build()', () => {
    beforeAll(async () => {
      initialCtx = await createInitialContext(new ChainDefinition(fakeDefinition), {}, 1234, {
        baz: 'arst'
      });
    });

    it('checks chain definition', async () => {
      // build with an invalid dependency
      await expect(() =>
        build(
          runtime,
          new ChainDefinition(_.assign({}, fakeDefinition, { invoke: { smartFunc: { depends: ['contract.Fake'] } } })),
          {},
          initialCtx
        )
      ).rejects.toThrowError('Your cannonfile is invalid: please resolve the following issues before building your project');
    });

    describe('without layers and skipped steps', () => {
      const handler = jest.fn();
      let newState: DeploymentState;

      beforeAll(async () => {
        runtime.on(Events.PostStepExecute, handler);
        runtime.on(Events.SkipDeploy, handler);

        jest.mocked(invokeStep.exec).mockRejectedValueOnce(new Error('cant do this right now'));

        newState = await build(runtime, new ChainDefinition(fakeDefinition), {}, initialCtx);
      });

      it('returns correct (partial) state', async () => {
        // should have state for contract, but not state for invoke
        expect(newState['contract.Yoop'].artifacts).toStrictEqual(expectedStateOut['contract.Yoop'].artifacts);

        expect(newState['invoke.smartFunc']).toBeUndefined();
      });

      /*it('emits correct runtime events', async () => {
        expect(handler.mock.calls[0]).toStrictEqual([Events.DeployContract]);
        expect(handler.mock.calls[1]).toStrictEqual([Events.SkipDeploy]);
      });*/
    });

    describe('without layers', () => {
      it('returns correct state', async () => {
        const newState = await build(runtime, new ChainDefinition(fakeDefinition), {}, initialCtx);

        expect(newState['contract.Yoop'].artifacts).toStrictEqual({
          contracts: {
            Yoop: {
              address: '0x0987098709870987098709870987098709870987',
              deployTxnHash: '0x1234',
              sourceName: 'Wohoo.sol',
              contractName: 'Wohoo',
              abi: [],
              deployedOn: 'contract.Yoop'
            }
          }
        });
      });

      it('re-running with same state causes no events on subsequent invoke', async () => {
        const newState = await build(runtime, new ChainDefinition(fakeDefinition), {}, initialCtx);

        const handler = jest.fn();
        runtime.on(Events.PreStepExecute, handler);

        const nextState = await build(runtime, new ChainDefinition(fakeDefinition), newState, initialCtx);

        // state should not have been changed at all
        expect(newState).toStrictEqual(nextState);

        // handler should have gotten no calls because no steps were run
        console.log(handler.mock.calls);
        expect(handler).toBeCalledTimes(0);
      });
    });
  });

  /*describe.skip('buildLayer()', () => {
    it('runs steps depth first', async () => {});

    it('restores before each layer', async () => {});

    it('takes snapshots after layer', async () => {});

    it('does not duplicate building of a layer', async () => {});
  });*/

  describe('getOutputs()', () => {
    it('merges chain artifacts', async () => {
      const artifacts = await getOutputs(runtime, new ChainDefinition(fakeDefinition), expectedStateOut);

      expect(artifacts?.contracts?.Yoop.address).toStrictEqual(
        expectedStateOut['contract.Yoop'].artifacts.contracts!.Yoop.address
      );
      expect(artifacts?.txns?.smartFunc.hash).toStrictEqual('');
    });

    it('loads state when snapshots are present', async () => {
      // enable snapshots so we can verify this
      (runtime as any).snapshots = true;
      await getOutputs(runtime, new ChainDefinition(fakeDefinition), expectedStateOut);

      // should only be called for the leaf
      expect(provider.send).toBeCalledWith('hardhat_loadState', ['0x5678']);
      expect(provider.send).toBeCalledTimes(1);
    });
  });

  describe('runStep()', () => {
    it('emits on runtime', async () => {
      const handler = jest.fn();
      runtime.on(Events.PreStepExecute, handler);
      runtime.on(Events.PostStepExecute, handler);
      const stepData = await runStep(
        runtime,
        { name: fakeDefinition.name, version: fakeDefinition.version, currentLabel: 'contract.Yoop' },
        (fakeDefinition as any).contract.Yoop,
        initialCtx
      );

      expect(stepData).toStrictEqual(expectedStateOut['contract.Yoop'].artifacts);
    });
  });

  describe('createInitialContext()', () => {
    it('assembles correctly', async () => {
      const pkg = { foo: 'bard' };
      const ctx = await createInitialContext(new ChainDefinition(fakeDefinition), pkg, 5, { baz: 'boop' });

      expect(ctx.chainId).toBe(5);
      expect(ctx.package).toBe(pkg);
      expect(ctx.settings.foo).toStrictEqual('bar');
      expect(ctx.settings.baz).toStrictEqual('boop');
      expect(parseInt(ctx.timestamp)).toBeCloseTo(Date.now() / 1000, -2);
      expect(ctx.contracts).toStrictEqual({});
      expect(ctx.extras).toStrictEqual({});
      expect(ctx.txns).toStrictEqual({});
      expect(ctx.imports).toStrictEqual({});
    });
  });
});
