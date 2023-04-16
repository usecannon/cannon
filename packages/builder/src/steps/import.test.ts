
import '../actions';
import action from './import';
import { fakeCtx, fakeRuntime } from './testUtils';

describe('setps/import.ts', () => {

  describe('configInject()', () => {
    it('injects all fields', async () => {

      const result = action.configInject(fakeCtx, {
        source: '<%= settings.a %>',
        chainId: 1234,
        preset: '<%= settings.c %>',
        depends: []
      });

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

      const result = await action.getState(fakeRuntime, fakeCtx, { source: 'hello:1.0.0' });

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
