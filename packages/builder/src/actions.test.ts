import { ActionKinds, registerAction, getChainDefinitionValidator, CannonAction } from './actions';
import { ChainArtifacts, ChainBuilderContext, ChainBuilderContextWithHelpers, ChainBuilderRuntimeInfo } from './types';

const FakeAction: CannonAction = {
  label: 'fake',

  validate: {
    properties: {
      hello: { type: 'string' },
      foo: { type: 'int32' },
    },
  },

  async getState(_runtime: ChainBuilderRuntimeInfo, ctx: ChainBuilderContextWithHelpers, config: Record<string, unknown>) {
    return this.configInject(ctx, config, { name: '', version: '', currentLabel: '' });
  },

  configInject(ctx: ChainBuilderContext, config: Record<string, unknown>) {
    return config;
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async exec(): /*_runtime: ChainBuilderRuntimeInfo,
    _ctx: ChainBuilderContext,
    _config: Record<string, unknown>*/
  Promise<ChainArtifacts> {
    return {};
  },
};

describe('actions.ts', () => {
  describe('registerAction()', () => {
    it('does not allow redeclaration of step with same name', () => {
      expect(() => registerAction({ ...FakeAction, label: 'contract' })).toThrowError('already declared');
    });

    it('throws an error on missing "label"', () => {
      expect(() => registerAction({ ...FakeAction, label: undefined as unknown as string })).toThrowError(
        'missing "label" property on plugin definition'
      );
    });

    it('registers action kind on success', () => {
      registerAction(FakeAction);

      expect(ActionKinds).toHaveProperty('fake');

      // calling the chain definition validator should not throw for this
      getChainDefinitionValidator()({ fake: { hello: 'woot', foo: 'bar' } });
    });
  });

  describe('getChainDefinitionValidator()', () => {
    it('returns ajv validator', async () => {
      expect(getChainDefinitionValidator().schema).toBeTruthy();
    });
  });
});
