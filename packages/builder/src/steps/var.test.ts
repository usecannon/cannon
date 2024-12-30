import { fixtureCtx } from '../../test/fixtures';
import { fakeRuntime } from './utils.test.helper';
import { PackageReference } from '../package-reference';
import action from './var';

describe('steps/var.ts', () => {
  describe('configInject()', () => {
    it('injects all fields', async () => {
      const result = action.configInject(
        fixtureCtx({
          settings: { a: 'A', b: 'B', from: 'FROM', salt: 'SALT' },
        }),
        {
          smooth: 'sailing',
          foo: '<%= settings.from %>',
          bar: '<%= settings.salt %>',
          // TODO: For some reason the zod types dont come out here to properly represent `depends`
          depends: ['<%= settings.A %>'] as any,
        }
      );

      expect(result).toStrictEqual({
        smooth: 'sailing',
        foo: 'FROM',
        bar: 'SALT',
        depends: ['<%= settings.A %>'],
      });
    });
  });

  describe('getState()', () => {
    it('resolves correct properties on state', async () => {
      const runtime = fakeRuntime;

      const ctx = fixtureCtx({ settings: { woot: 'w' } });

      const config = {
        smooth: 'sailing',
        foo: '<%= settings.woot %>',
        depends: ['woot'],
      };

      const result = await action.getState(runtime, ctx, config as any, { ref: null, currentLabel: 'var.Var' });

      expect(result[0]).toStrictEqual({
        smooth: 'sailing',
        foo: 'w',
      });
    });
  });

  describe('exec()', () => {
    it('works forwards compatible', async () => {
      const step = {
        ref: new PackageReference('var-test:0.0.0'),
        currentLabel: 'setting.something',
      };

      const runtime = fakeRuntime;
      const config = { defaultValue: 'shoutout' };

      const arts = await action.exec(runtime, fixtureCtx(), config, step);
      expect(arts).toStrictEqual({ settings: { something: 'shoutout' } });
    });

    it('works backwards compatible', async () => {
      const step = {
        ref: new PackageReference('var-test:0.0.0'),
        currentLabel: 'var.something',
      };

      const runtime = fakeRuntime;
      const config = { else: 'shoutout' };

      const arts = await action.exec(runtime, fixtureCtx(), config, step);
      expect(arts).toStrictEqual({ settings: { else: 'shoutout' } });
    });
  });
});
