import { fixtureCtx } from '../../test/fixtures';
import { fakeRuntime } from './utils.test.helper';
import { PackageReference } from '../package-reference';
import action from './var';
import { VarDefinition } from './var';

describe('steps/var.ts', () => {
  describe('configInject()', () => {
    it('injects all fields (legacy format)', async () => {
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

    it('injects values in new var namespace format', async () => {
      const result = action.configInject(
        fixtureCtx({
          settings: { owner: '0x1234567890123456789012345678901234567890' },
        }),
        {
          foobar: {
            value: '<%= settings.owner %>',
            type: 'address' as const,
            description: 'Contract owner',
          },
          baz: {
            type: 'string' as const,
          },
        }
      );

      expect(result).toStrictEqual({
        foobar: {
          value: '0x1234567890123456789012345678901234567890',
          type: 'address',
          description: 'Contract owner',
        },
        baz: {
          type: 'string',
        },
      });
    });
  });

  describe('getState()', () => {
    it('resolves correct properties on state (legacy format)', async () => {
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
    it('works forwards compatible (legacy setting format)', async () => {
      const step = {
        ref: new PackageReference('var-test:0.0.0'),
        currentLabel: 'setting.something',
      };

      const runtime = fakeRuntime;
      const config = { defaultValue: 'shoutout' };

      const arts = await action.exec(runtime, fixtureCtx(), config, step);
      expect(arts).toStrictEqual({ settings: { something: 'shoutout' } });
    });

    it('works backwards compatible (legacy var format)', async () => {
      const step = {
        ref: new PackageReference('var-test:0.0.0'),
        currentLabel: 'var.something',
      };

      const runtime = fakeRuntime;
      const config = { else: 'shoutout' };

      const arts = await action.exec(runtime, fixtureCtx(), config, step);
      expect(arts).toStrictEqual({ settings: { else: 'shoutout' } });
    });

    describe('new var namespace format', () => {
      it('returns vars in namespaced format', async () => {
        const step = {
          ref: new PackageReference('var-test:0.0.0'),
          currentLabel: 'var.main',
        };

        const runtime = fakeRuntime;
        const config: Record<string, VarDefinition> = {
          foobar: {
            value: 'my super variable',
            type: 'string',
            description: 'Super important variable documentation',
          },
        };

        const arts = await action.exec(runtime, fixtureCtx(), config as any, step);
        expect(arts).toStrictEqual({
          settings: { foobar: 'my super variable' },
          vars: { main: { foobar: 'my super variable' } },
        });
      });

      it('validates address type', async () => {
        const step = {
          ref: new PackageReference('var-test:0.0.0'),
          currentLabel: 'var.main',
        };

        const runtime = fakeRuntime;
        const config: Record<string, VarDefinition> = {
          owner: {
            value: '0x1234567890123456789012345678901234567890',
            type: 'address',
          },
        };

        const arts = await action.exec(runtime, fixtureCtx(), config as any, step);
        expect(arts.settings.owner).toBe('0x1234567890123456789012345678901234567890');
      });

      it('throws on invalid address type', async () => {
        const step = {
          ref: new PackageReference('var-test:0.0.0'),
          currentLabel: 'var.main',
        };

        const runtime = fakeRuntime;
        const config: Record<string, VarDefinition> = {
          owner: {
            value: 'not-an-address',
            type: 'address',
          },
        };

        await expect(action.exec(runtime, fixtureCtx(), config as any, step)).rejects.toThrow(
          'Variable "owner" in namespace "main" has invalid value "not-an-address" for type "address"'
        );
      });

      it('throws when value is missing and no override provided', async () => {
        const step = {
          ref: new PackageReference('var-test:0.0.0'),
          currentLabel: 'var.main',
        };

        const runtime = fakeRuntime;
        const config: Record<string, VarDefinition> = {
          requiredVar: {
            type: 'string',
          },
        };

        await expect(action.exec(runtime, fixtureCtx(), config as any, step)).rejects.toThrow(
          'Variable "requiredVar" in namespace "main" has no value defined'
        );
      });

      it('uses override when value is missing', async () => {
        const step = {
          ref: new PackageReference('var-test:0.0.0'),
          currentLabel: 'var.main',
        };

        const runtime = fakeRuntime;
        const config: Record<string, VarDefinition> = {
          overrideableVar: {
            type: 'string',
            description: 'Can be overridden',
          },
        };

        const ctx = fixtureCtx({
          overrideSettings: {
            'main.overrideableVar': 'overridden-value',
          },
        });

        const arts = await action.exec(runtime, ctx, config as any, step);
        expect(arts.settings.overrideableVar).toBe('overridden-value');
        expect(arts.vars!.main.overrideableVar).toBe('overridden-value');
      });

      it('validates number type', async () => {
        const step = {
          ref: new PackageReference('var-test:0.0.0'),
          currentLabel: 'var.main',
        };

        const runtime = fakeRuntime;
        const config: Record<string, VarDefinition> = {
          amount: {
            value: '12345',
            type: 'number',
          },
        };

        const arts = await action.exec(runtime, fixtureCtx(), config as any, step);
        expect(arts.settings.amount).toBe('12345');
      });

      it('throws on invalid number type', async () => {
        const step = {
          ref: new PackageReference('var-test:0.0.0'),
          currentLabel: 'var.main',
        };

        const runtime = fakeRuntime;
        const config: Record<string, VarDefinition> = {
          amount: {
            value: 'not-a-number',
            type: 'number',
          },
        };

        await expect(action.exec(runtime, fixtureCtx(), config as any, step)).rejects.toThrow(
          'Variable "amount" in namespace "main" has invalid value "not-a-number" for type "number"'
        );
      });

      it('validates boolean type', async () => {
        const step = {
          ref: new PackageReference('var-test:0.0.0'),
          currentLabel: 'var.main',
        };

        const runtime = fakeRuntime;
        const config: Record<string, VarDefinition> = {
          enabled: {
            value: 'true',
            type: 'boolean',
          },
        };

        const arts = await action.exec(runtime, fixtureCtx(), config as any, step);
        expect(arts.settings.enabled).toBe('true');
      });

      it('validates bytes type', async () => {
        const step = {
          ref: new PackageReference('var-test:0.0.0'),
          currentLabel: 'var.main',
        };

        const runtime = fakeRuntime;
        const config: Record<string, VarDefinition> = {
          data: {
            value: '0x1234',
            type: 'bytes',
          },
        };

        const arts = await action.exec(runtime, fixtureCtx(), config as any, step);
        expect(arts.settings.data).toBe('0x1234');
      });
    });
  });

  describe('getOutputs()', () => {
    it('returns settings format for legacy var', () => {
      const config = { foo: 'bar' };
      const outputs = action.getOutputs(config, { ref: null, currentLabel: 'var.something' });
      expect(outputs).toContain('settings.foo');
    });

    it('returns namespaced var format for new format', () => {
      const config: Record<string, VarDefinition> = {
        foobar: {
          value: 'test',
          type: 'string',
        },
      };
      const outputs = action.getOutputs(config as any, { ref: null, currentLabel: 'var.main' });
      expect(outputs).toContain('var.main.foobar');
    });
  });
});
