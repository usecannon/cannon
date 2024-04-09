import _ from 'lodash';
import { fixtureSigner, makeFakeProvider } from '../test/fixtures';
import { RawChainDefinition } from './actions';
import { build, createInitialContext, getOutputs, runStep, addOutputsToContext } from './builder';
import { BUILD_VERSION } from './constants';
import { ChainDefinition } from './definition';
import { IPFSLoader } from './loader';
import { InMemoryRegistry } from './registry';
import { ChainBuilderRuntime, Events } from './runtime';
import deployStep from './steps/deploy';
import varStep from './steps/var';
import pullStep from './steps/pull';
import invokeStep from './steps/invoke';
import { ChainBuilderContext, ContractArtifact, DeploymentState } from './types';

jest.mock('./steps/deploy');
jest.mock('./steps/invoke');

describe('builder.ts', () => {
  const loader = new IPFSLoader('', null as any);

  const getSigner = jest.fn(async () => fixtureSigner());

  const getDefaultSigner = jest.fn(async () => fixtureSigner());

  const getArtifact = jest.fn(async (n: string): Promise<ContractArtifact> => {
    return {
      contractName: n,
      sourceName: `${n}.sol`,
      abi: [],
      bytecode: '0x',
      deployedBytecode: '0x',
      linkReferences: {},
    };
  });

  let provider: any;
  let runtime: ChainBuilderRuntime;

  beforeEach(() => {
    provider = makeFakeProvider();
    jest.mocked(provider.getChainId).mockResolvedValue(1234);
    jest.mocked(provider.dumpState).mockImplementation(async () => {
      return '0xfoobar';
    });
    jest.mocked(provider.extend).mockReturnThis();
    deployStep.validate = { safeParse: jest.fn().mockReturnValue({ success: true } as any) } as any;
    varStep.validate = { safeParse: jest.fn().mockReturnValue({ success: true } as any) } as any;
    pullStep.validate = { safeParse: jest.fn().mockReturnValue({ success: true } as any) } as any;
    invokeStep.validate = { safeParse: jest.fn().mockReturnValue({ success: true } as any) } as any;
    runtime = new ChainBuilderRuntime(
      {
        allowPartialDeploy: true,
        provider: provider,
        chainId: 1234,
        snapshots: false,
        getSigner,
        getDefaultSigner,
        getArtifact,
      },
      new InMemoryRegistry(),
      { ipfs: loader }
    );
  });

  const fakeDefinition: RawChainDefinition = {
    name: 'super-duper',
    version: '0.1.0',
    var: {
      setStuff: { foo: 'bar' },
    },
    deploy: {
      Yoop: {
        artifact: 'Wohoo',
      },
    },
    invoke: {
      smartFunc: {
        target: '0x1234123412341234123412341234123412341234',
        func: 'smartFunc',
        args: [1, 2, 3, '<%= contracts.Yoop.address %>'],
        from: '0x1234123412341234123412341234123412341234',
        depends: ['deploy.Yoop'],
      },
    },
    pull: {
      thePackage: {
        source: 'source',
        chainId: 1234,
        preset: 'preset',
        depends: [],
      },
    },
  } as RawChainDefinition;

  const expectedStateOut: DeploymentState = {
    'deploy.Yoop': {
      artifacts: {
        contracts: {
          Yoop: {
            address: '0x0987098709870987098709870987098709870987',
            deployTxnHash: '0x1234',
            sourceName: 'Wohoo.sol',
            contractName: 'Wohoo',
            abi: [],
            deployedOn: 'deploy.Yoop',
            gasCost: '0',
            gasUsed: 0,
          },
        },
      },
      version: BUILD_VERSION,
      hash: '12341234',
      chainDump: '0x1234',
    },
    'invoke.smartFunc': {
      artifacts: {
        txns: {
          smartFunc: {
            hash: '0x',
            events: {},
            deployedOn: 'invoke.smartFunc',
            gasCost: '0',
            gasUsed: 0,
            signer: '',
          },
        },
      },
      version: BUILD_VERSION,
      hash: '56786789',
      chainDump: '0x5678',
    },
    'pull.thePackage': {
      artifacts: {
        imports: {
          thePackage: {
            url: '0x1234',
          },
        },
      },
      version: BUILD_VERSION,
      hash: '79797979',
      chainDump: '0x7979',
    },
    'var.setStuff': {
      artifacts: {
        settings: {
          foo: 'bar',
        },
      },
      version: BUILD_VERSION,
      hash: '827372',
      chainDump: '0x999999999',
    },
  };

  let initialCtx: ChainBuilderContext;

  jest.mocked(deployStep.getState).mockResolvedValue([{}] as any);

  jest.mocked(deployStep.exec).mockResolvedValue({
    contracts: {
      Yoop: {
        address: '0x0987098709870987098709870987098709870987',
        deployTxnHash: '0x1234',
        sourceName: 'Wohoo.sol',
        contractName: 'Wohoo',
        abi: [],
        deployedOn: 'deploy.Yoop',
        gasCost: '0',
        gasUsed: 0,
      },
    },
  });
  jest.mocked(deployStep.getInputs).mockReturnValue({ accesses: [], unableToCompute: false });
  jest.mocked(deployStep.getOutputs).mockReturnValue([]);

  jest.mocked(invokeStep.getState).mockResolvedValue([{}] as any);
  jest.mocked(invokeStep.exec).mockResolvedValue({
    txns: {
      smartFunc: { hash: '0x56785678', events: {}, deployedOn: 'invoke.smartFunc', gasCost: '0', gasUsed: 0, signer: '' },
    },
  });
  jest.mocked(invokeStep.getInputs).mockReturnValue({ accesses: [], unableToCompute: false });
  jest.mocked(invokeStep.getOutputs).mockReturnValue([]);

  describe('build()', () => {
    beforeAll(async () => {
      initialCtx = await createInitialContext(new ChainDefinition(fakeDefinition), {}, 1234, {
        baz: 'arst',
      });
    });

    it('checks chain definition', async () => {
      // build with an invalid dependency
      const fakeDefWithBadDep = _.assign({}, fakeDefinition, {
        invoke: { smartFunc: { target: ['something'], func: 'wohoo', depends: ['deploy.Fake'] } },
      });
      expect(() => build(runtime, new ChainDefinition(fakeDefWithBadDep), {}, initialCtx)).toThrowError(
        'invalid dependency'
      );
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
        expect(newState['deploy.Yoop'].artifacts).toStrictEqual(expectedStateOut['deploy.Yoop'].artifacts);

        expect(newState['invoke.smartFunc']).toBeUndefined();
      });
    });

    describe('without layers', () => {
      const handler = jest.fn();
      let newState: DeploymentState;

      beforeAll(async () => {
        runtime.on(Events.PostStepExecute, handler);
        runtime.on(Events.SkipDeploy, handler);

        jest.mocked(invokeStep.exec).mockRejectedValue(new Error('cant do this right now'));

        newState = await build(runtime, new ChainDefinition(fakeDefinition), {}, initialCtx);
      });

      it('returns correct state', async () => {
        expect(newState['deploy.Yoop'].artifacts).toStrictEqual({
          contracts: {
            Yoop: {
              address: '0x0987098709870987098709870987098709870987',
              deployTxnHash: '0x1234',
              sourceName: 'Wohoo.sol',
              contractName: 'Wohoo',
              abi: [],
              deployedOn: 'deploy.Yoop',
              gasCost: '0',
              gasUsed: 0,
            },
          },
        });
        expect(newState['var.setStuff'].artifacts).toStrictEqual({
          settings: {
            foo: 'bar',
          },
        });
      });

      it('re-running with same state causes no events on subsequent invoke', async () => {
        const handler = jest.fn();
        runtime.on(Events.PostStepExecute, handler);

        const nextState = await build(runtime, new ChainDefinition(fakeDefinition), newState, initialCtx);

        // state should not have been changed at all
        expect(nextState).toStrictEqual(newState);

        // handler should have gotten no calls because no steps were run
        expect(handler).toHaveBeenCalledTimes(0);
      });
    });
  });

  describe('getOutputs()', () => {
    it('merges chain artifacts', async () => {
      const artifacts = await getOutputs(runtime, new ChainDefinition(fakeDefinition), expectedStateOut);

      expect(artifacts?.contracts?.Yoop.address).toStrictEqual(
        expectedStateOut['deploy.Yoop'].artifacts.contracts!.Yoop.address
      );
      expect(artifacts?.txns?.smartFunc.hash).toStrictEqual('0x');
    });

    it('loads state when snapshots are present', async () => {
      // enable snapshots so we can verify this
      (runtime as any).snapshots = true;
      await getOutputs(runtime, new ChainDefinition(fakeDefinition), expectedStateOut);

      // should only be called for the leaf
      expect(provider.loadState).toBeCalledWith({ state: '0x5678' });
      expect(provider.loadState).toBeCalledTimes(3);
    });
  });

  describe('runStep()', () => {
    it('emits on runtime', async () => {
      const handler = jest.fn();
      runtime.on(Events.PreStepExecute, handler);
      runtime.on(Events.PostStepExecute, handler);
      const stepData = await runStep(
        runtime,
        { name: fakeDefinition.name, version: fakeDefinition.version, currentLabel: 'deploy.Yoop' },
        (fakeDefinition as any).deploy.Yoop,
        initialCtx
      );

      expect(stepData).toStrictEqual(expectedStateOut['deploy.Yoop'].artifacts);
    });
  });

  describe('addOutputsToContext()', () => {
    let ctx: ChainBuilderContext;

    beforeAll(async () => {
      const pkg = { foo: 'bard' };
      ctx = await createInitialContext(new ChainDefinition(fakeDefinition), pkg, 5, { baz: 'boop' });
    });

    it('adds artifacts to context', async () => {
      const artifacts = {
        contracts: {
          Yoop: {
            address: '0x0987098709870987098709870987098709870987' as `0x${string}`,
            deployTxnHash: '0x1234',
            sourceName: 'Wohoo.sol',
            contractName: 'Wohoo',
            abi: [],
            deployedOn: 'deploy.Yoop',
            gasCost: '0',
            gasUsed: 0,
          },
        },
        txns: {
          smartFunc: {
            hash: '0x' as `0x${string}`,
            events: {},
            deployedOn: 'invoke.smartFunc',
            gasCost: '0',
            gasUsed: 0,
            signer: '',
          },
        },
        imports: {
          thePackage: {
            url: '0x1234',
          },
        },
        settings: {
          foo: 'bar',
        },
      };
      const expectedCtx = {
        package: { foo: 'bard' },
        chainId: 5,
        overrideSettings: { baz: 'boop' },
        contracts: {
          Yoop: {
            address: '0x0987098709870987098709870987098709870987',
            deployTxnHash: '0x1234',
            contractName: 'Wohoo',
            sourceName: 'Wohoo.sol',
            abi: [],
            deployedOn: 'deploy.Yoop',
            gasCost: '0',
            gasUsed: 0,
          },
        },
        txns: {
          smartFunc: {
            hash: '0x',
            events: {},
            deployedOn: 'invoke.smartFunc',
            gasCost: '0',
            gasUsed: 0,
            signer: '',
          },
        },
        imports: { thePackage: { url: '0x1234' } },
        settings: { baz: 'boop', foo: 'bar' },
        thePackage: { url: '0x1234' },
        'Yoop.address': '0x0987098709870987098709870987098709870987',
      };

      addOutputsToContext(ctx, artifacts);

      expect(ctx.chainId).toBe(5);
      expect(ctx.package).toEqual({ foo: 'bard' });
      expect(ctx.overrideSettings).toStrictEqual({ baz: 'boop' });
      expect(parseInt(ctx.timestamp)).toBeCloseTo(Date.now() / 1000, -2);
      expect(ctx.contracts).toStrictEqual(expectedCtx.contracts);
      expect(ctx.txns).toStrictEqual(expectedCtx.txns);
      expect(ctx.imports).toStrictEqual(expectedCtx.imports);
      expect(ctx.settings).toStrictEqual(expectedCtx.settings);
      expect(ctx.thePackage).toStrictEqual(expectedCtx.thePackage);
      expect(ctx['Yoop.address']).toStrictEqual(expectedCtx['Yoop.address']);
    });

    it('supports recursive imports', async () => {
      const artifacts = {
        contracts: {
          Yoop: {
            address: '0x0987098709870987098709870987098709870987' as `0x${string}`,
            deployTxnHash: '0x1234',
            sourceName: 'Wohoo.sol',
            contractName: 'Wohoo',
            abi: [],
            deployedOn: 'deploy.Yoop',
            gasCost: '0',
            gasUsed: 0,
          },
        },
        txns: {
          smartFunc: {
            hash: '0x' as `0x${string}`,
            events: {},
            deployedOn: 'invoke.smartFunc',
            gasCost: '0',
            gasUsed: 0,
            signer: '',
          },
        },
        imports: {
          thePackage: {
            url: '0x1234',
            imports: {
              superPackage: {
                url: '0x4321',
              },
            },
          },
        },
        settings: {
          foo: 'bar',
        },
      };
      const expectedCtx = {
        package: { foo: 'bard' },
        chainId: 5,
        overrideSettings: { baz: 'boop' },
        contracts: {
          Yoop: {
            address: '0x0987098709870987098709870987098709870987',
            deployTxnHash: '0x1234',
            contractName: 'Wohoo',
            sourceName: 'Wohoo.sol',
            abi: [],
            deployedOn: 'deploy.Yoop',
            gasCost: '0',
            gasUsed: 0,
          },
        },
        txns: {
          smartFunc: {
            hash: '0x',
            events: {},
            deployedOn: 'invoke.smartFunc',
            gasCost: '0',
            gasUsed: 0,
            signer: '',
          },
        },
        imports: { thePackage: { url: '0x1234', imports: { superPackage: { url: '0x4321' } } } },
        settings: { baz: 'boop', foo: 'bar' },
        thePackage: { url: '0x1234', superPackage: { url: '0x4321' } },
        'Yoop.address': '0x0987098709870987098709870987098709870987',
      };

      addOutputsToContext(ctx, artifacts);

      expect(ctx.chainId).toBe(5);
      expect(ctx.package).toEqual({ foo: 'bard' });
      expect(ctx.overrideSettings).toStrictEqual({ baz: 'boop' });
      expect(parseInt(ctx.timestamp)).toBeCloseTo(Date.now() / 1000, -2);
      expect(ctx.contracts).toStrictEqual(expectedCtx.contracts);
      expect(ctx.txns).toStrictEqual(expectedCtx.txns);
      expect(ctx.imports).toStrictEqual(expectedCtx.imports);
      expect(ctx.settings).toStrictEqual(expectedCtx.settings);
      expect(ctx.thePackage).toStrictEqual(expectedCtx.thePackage);
      expect(ctx['Yoop.address']).toStrictEqual(expectedCtx['Yoop.address']);
    });
  });

  describe('createInitialContext()', () => {
    it('assembles correctly', async () => {
      const pkg = { foo: 'bard' };
      const ctx = await createInitialContext(new ChainDefinition(fakeDefinition), pkg, 5, { baz: 'boop' });

      expect(ctx.chainId).toBe(5);
      expect(ctx.package).toBe(pkg);
      expect(ctx.overrideSettings.baz).toStrictEqual('boop');
      expect(parseInt(ctx.timestamp)).toBeCloseTo(Date.now() / 1000, -2);
      expect(ctx.contracts).toStrictEqual({});
      expect(ctx.txns).toStrictEqual({});
      expect(ctx.imports).toStrictEqual({});
      expect(ctx.settings).toStrictEqual({ baz: 'boop' });
    });
  });
});
