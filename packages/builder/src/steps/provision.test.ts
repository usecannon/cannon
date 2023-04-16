import '../actions';
import action from './provision';
import { fakeCtx, fakeRuntime } from './testUtils';

describe('setps/provision.ts', () => {
  describe('configInject()', () => {
    it('injects all fields', async () => {

      const result = action.configInject(fakeCtx, {
        source: '<%= settings.a %>',
      }, { name: 'who', version: '1.0.0', currentLabel: 'provision.whatever' });

      expect(result).toStrictEqual({
        source: 'a',
        chainId: 1234,
        preset: 'c',
        depends: []
      });
    });
  });

  describe('getState()', () => {
    it('resolves correct properties with minimal config', async () => {

      await fakeRuntime.loader.resolver.publish(['hello:1.0.0'], '1-main', 'https://something.com', '');

      const result = await action.getState(fakeRuntime, fakeCtx, { source: 'hello:1.0.0' }, { name: 'who', version: '1.0.0', currentLabel: 'provision.whatever' });

      expect(result).toStrictEqual({
        url: 'https://something.com'
      })
    });
  });

  describe('exec()', () => {

    it('throws if deployment not found', async () => {

    });

    it('works properly', async () => {

    });
  });
});
