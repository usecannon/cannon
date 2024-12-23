import _ from 'lodash';
import { RawChainDefinition } from './actions';
import { ChainDefinition, validatePackageName, validatePackageVersion } from './definition';

function makeFakeChainDefinition(nodes: { [n: string]: any }) {
  const rawDef: RawChainDefinition = {
    name: 'test',
    version: '1.0.0',
  };

  for (const n in nodes) {
    _.set(rawDef, n, nodes[n]);
  }

  return new ChainDefinition(rawDef);
}

describe('ChainDefinition', () => {
  it('does not have output clash on var or settings', () => {
    const rawDef: RawChainDefinition = {
      name: 'test',
      version: '1.0.0',
      var: {
        a: { b: '<%= settings.c %>', description: 'desc 1' },
        d: { c: '1234', description: 'desc 2' },
      },
      deploy: {
        woot: { artifact: 'wohoo', args: ['<%= settings.b %>'], depends: [] },
      },
    };

    expect(new ChainDefinition(rawDef)).toBeTruthy;
  });

  describe('validatePackageName()', () => {
    it('verifies the name is not too short', () => {
      expect(() => validatePackageName('hh')).toThrowError('must be at least');
    });

    it('verifies the name is not too long', () => {
      expect(() => validatePackageName('12341234123412341234123412341234')).toThrowError('must be at most');
    });

    it('verifies the name does not have dash at beginning or end', () => {
      expect(() => validatePackageName('wohoo--')).toThrowError('dash');
      expect(() => validatePackageName('--wohoo')).toThrowError('dash');
    });

    it('verifies character set', () => {
      expect(() => validatePackageName('woh+oo')).toThrowError('dash');
    });

    it('works if there is no problem', () => {
      validatePackageName('something--1234-fun');
    });
  });

  describe('validatePackageVersion()', () => {
    it('verifies the name is not too long', () => {
      expect(() => validatePackageVersion('12341234123412341234123412341234')).toThrowError('must be at most');
    });

    it('works if there is no problem', () => {
      validatePackageVersion('something-1234-fun');
    });
  });

  describe('computeDependencies()', () => {
    it('does not modify the underlying `raw` data structure', () => {
      const rawDef: RawChainDefinition = {
        name: 'test',
        version: '1.0.0',
        var: {
          a: { b: '<%= settings.c %>' },
          d: { c: '1234' },
        },
        deploy: {
          woot: { artifact: 'wohoo', args: ['<%= settings.b %>'], depends: [] },
        },
      };

      const def = new ChainDefinition(_.cloneDeep(rawDef));

      expect((def as any).raw).toEqual(rawDef);
    });
  });

  describe('checkCycles()', () => {
    it('works when there are 0 nodes', async () => {
      const def = makeFakeChainDefinition({});
      expect(def.checkCycles()).toBeNull();
    });

    it('works when there are 4 nodes in a diamond with extraneous', async () => {
      const def = makeFakeChainDefinition({
        'contract.a': { artifact: 'Xx', depends: [] },
        'contract.b': { artifact: 'Xx', depends: ['contract.a'] },
        'contract.c': { artifact: 'Xx', depends: ['contract.a'] },
        'contract.d': { artifact: 'Xx', depends: ['contract.b', 'contract.c', 'contract.a'] },
      });
      expect(def.checkCycles()).toBeNull();
    });

    it('returns cycle when there is one node depending on itself', async () => {
      const def = makeFakeChainDefinition({ 'contract.a': { artifact: 'Xx', depends: ['contract.a'] } });
      expect(def.checkCycles()).toEqual(['contract.a']);
    });

    it('returns cycle when there are two nodes depending on each other', async () => {
      const def = makeFakeChainDefinition({
        'contract.a': { artifact: 'Xx', depends: ['contract.b'] },
        'contract.b': { artifact: 'Xx', depends: ['contract.a'] },
      });
      expect(def.checkCycles()).toEqual(['contract.b', 'contract.a']);
    });

    it('returns cycle when there are three nodes depending on each other with other conforming nodes', async () => {
      const def = makeFakeChainDefinition({
        'contract.a': { artifact: 'Xx', depends: [] },

        'contract.b': { artifact: 'Xx', depends: ['contract.c'] },
        'contract.c': { artifact: 'Xx', depends: ['contract.y'] },

        // cycle
        'contract.x': { artifact: 'Xx', depends: ['contract.y'] },
        'contract.y': { artifact: 'Xx', depends: ['contract.z'] },
        'contract.z': { artifact: 'Xx', depends: ['contract.x'] },
      });

      expect(def.checkCycles()).toEqual(['contract.z', 'contract.x', 'contract.y']);
    });
  });

  describe('getStateLayers()', () => {
    it('works when there is just one node', async () => {
      const def = makeFakeChainDefinition({
        'contract.a': { artifact: 'Xx', depends: [] },
      });

      expect(def.getStateLayers()).toEqual({
        'contract.a': {
          actions: ['contract.a'],
          depends: [],
        },
      });
    });

    it('works when there are three nodes in series', async () => {
      const def = makeFakeChainDefinition({
        'contract.a': { artifact: 'Xx', depends: [] },
        'contract.b': { artifact: 'Xx', depends: ['contract.a'] },
        'contract.c': { artifact: 'Xx', depends: ['contract.b'] },
      });

      expect(def.getStateLayers()).toEqual({
        'contract.a': {
          actions: ['contract.a'],
          depends: [],
        },
        'contract.b': {
          actions: ['contract.b'],
          depends: ['contract.a'],
        },
        'contract.c': {
          actions: ['contract.c'],
          depends: ['contract.b'],
        },
      });
    });

    it('works when there are three nodes in triangle', async () => {
      const def = makeFakeChainDefinition({
        'contract.a': { artifact: 'Xx', depends: [] },
        'contract.b': { artifact: 'Xx', depends: ['contract.a'] },
        'contract.c': { artifact: 'Xx', depends: ['contract.a'] },
      });

      const layers = def.getStateLayers();

      expect(layers['contract.a']).toEqual({
        actions: ['contract.a'],
        depends: [],
      });

      expect(layers['contract.b']).toEqual(layers['contract.c']);

      expect(layers['contract.b'].actions).toEqual(['contract.b', 'contract.c']);

      expect(layers['contract.b'].depends).toEqual(['contract.a']);
    });

    it('works when there are four nodes in a diamond pattern', async () => {
      const def = makeFakeChainDefinition({
        'contract.a': { artifact: 'Xx', depends: [] },
        'contract.b': { artifact: 'Xx', depends: ['contract.a'] },
        'contract.c': { artifact: 'Xx', depends: ['contract.a'] },
        'contract.d': { artifact: 'Xx', depends: ['contract.b', 'contract.c'] },
      });

      const layers = def.getStateLayers();

      expect(layers['contract.a']).toEqual({
        actions: ['contract.a'],
        depends: [],
      });

      expect(layers['contract.b']).toEqual(layers['contract.c']);

      expect(layers['contract.b'].actions).toEqual(['contract.b', 'contract.c']);

      expect(layers['contract.b'].depends).toEqual(['contract.a']);

      expect(layers['contract.d']).toEqual({
        actions: ['contract.d'],
        depends: ['contract.b'],
      });
    });

    it('works when there are four nodes in a diamond pattern with another side layer', async () => {
      const def = makeFakeChainDefinition({
        'contract.a': { artifact: 'Xx', depends: [] },
        'contract.b': { artifact: 'Xx', depends: ['contract.a'] },
        'contract.c': { artifact: 'Xx', depends: ['contract.a', 'contract.e'] },
        'contract.d': { artifact: 'Xx', depends: ['contract.b', 'contract.c'] },
        'contract.e': { artifact: 'Xx', depends: [] },
      });

      const layers = def.getStateLayers();

      expect(layers['contract.a']).toEqual({
        actions: ['contract.a'],
        depends: [],
      });

      expect(layers['contract.e']).toEqual({
        actions: ['contract.e'],
        depends: [],
      });

      expect(layers['contract.b']).toEqual(layers['contract.c']);

      expect(layers['contract.b'].actions).toEqual(['contract.b', 'contract.c']);

      expect(layers['contract.b'].depends).toEqual(['contract.a', 'contract.e']);

      expect(layers['contract.d']).toEqual({
        actions: ['contract.d'],
        depends: ['contract.b'],
      });
    });

    it('works when merging multiple assembled layers together', async () => {
      const def = makeFakeChainDefinition({
        'contract.a': { artifact: 'Xx', depends: ['contract.c'] },
        'contract.b': { artifact: 'Xx', depends: ['contract.c'] },
        'contract.c': { artifact: 'Xx', depends: ['contract.f', 'contract.e'] },
        'contract.d': { artifact: 'Xx', depends: ['contract.f'] },
        'contract.e': { artifact: 'Xx', depends: [] },
        'contract.f': { artifact: 'Xx', depends: [] },
      });

      const layers = def.getStateLayers();

      expect(layers['contract.f']).toEqual({
        actions: ['contract.f'],
        depends: [],
      });

      expect(layers['contract.c']).toEqual(layers['contract.d']);

      expect(layers['contract.c'].actions).toEqual(['contract.c', 'contract.d']);

      expect(layers['contract.c'].depends).toEqual(['contract.e', 'contract.f']);
    });

    it('works when nodes share multiple dependencies', async () => {
      const def = makeFakeChainDefinition({
        'contract.a': { artifact: 'Xx', depends: [] },
        'contract.b': { artifact: 'Xx', depends: [] },
        'contract.c': { artifact: 'Xx', depends: ['contract.a', 'contract.b'] },
        'contract.d': { artifact: 'Xx', depends: ['contract.a', 'contract.b'] },
      });

      const layers = def.getStateLayers();

      expect(layers['contract.a']).toEqual({
        actions: ['contract.a'],
        depends: [],
      });

      expect(layers['contract.c']).toEqual(layers['contract.d']);

      expect(layers['contract.c'].actions).toEqual(['contract.c', 'contract.d']);

      expect(layers['contract.c'].depends).toEqual(['contract.a', 'contract.b']);
    });

    /**
     * this is a macho edge case that unfortunately occurs when creating what is effectively a secondary topology.
     * Even if you have a transitive reduction, it is still possible to have a deep dependency reference
     * when this happens, its important only the topmost dependency is included (since he deeper dep is effectively already included deeper)
     */
    it('works when depending on a dependency from a deeper layer you already depend on', async () => {
      const def = makeFakeChainDefinition({
        'contract.d': { artifact: 'Xx', depends: [] },
        'contract.b': { artifact: 'Xx', depends: ['contract.d'] },
        'contract.c': { artifact: 'Xx', depends: ['contract.d'] },
        'contract.e': { artifact: 'Xx', depends: ['contract.c'] },
        'contract.f': { artifact: 'Xx', depends: ['contract.e'] },
        'contract.a': { artifact: 'Xx', depends: ['contract.b', 'contract.f'] },
      });

      const layers = def.getStateLayers();

      // dependency on contract b should be nullified dependence on contract f (which indirectly on a deep layer depends on contract b)
      expect(layers['contract.a'].depends).toEqual(['contract.f']);
    });

    /**
     * this is yet another macho edge case that occurs when merging a layer that has already been merged
     */
    it('works when two subsequent merges are required', async () => {
      const def = makeFakeChainDefinition({
        'contract.a': { artifact: 'Xx', depends: [] },
        'contract.b': { artifact: 'Xx', depends: [] },
        'contract.c': { artifact: 'Xx', depends: ['contract.a'] },
        'contract.d': { artifact: 'Xx', depends: ['contract.b'] },
        'contract.e': { artifact: 'Xx', depends: ['contract.a', 'contract.b'] },
      });

      const layers = def.getStateLayers();

      expect(layers['contract.a']).toEqual({
        actions: ['contract.a'],
        depends: [],
      });

      expect(layers['contract.e']).toEqual(layers['contract.d']);
      expect(layers['contract.e']).toEqual(layers['contract.c']);

      // make sure no extra structures were created in the process
      expect(_.uniq(Object.values(layers))).toHaveLength(3);
    });

    it('works when a step is independently depended upon by two layers', async () => {
      const def = makeFakeChainDefinition({
        'contract.L1': { artifact: 'Xx', depends: [] },
        'contract.L2': { artifact: 'Xx', depends: ['contract.L1'] },
        'contract.O': { artifact: 'Xx', depends: [] },
        // names here have to non-chronological to trigger the bug
        'contract.R1': { artifact: 'Xx', depends: ['contract.O', 'contract.L2'] },
        'contract.R2': { artifact: 'Xx', depends: ['contract.O', 'contract.L1'] },
      });

      const layers = def.getStateLayers();

      expect(layers['contract.L2'].depends).not.toContain('contract.L2');
      expect(layers['contract.R1'].depends).not.toContain('contract.R1');
      expect(layers['contract.R2'].depends).not.toContain('contract.R2');
    });
  });

  describe('printTopology()', () => {
    it('prints a complicated topology', () => {
      const def = makeFakeChainDefinition({
        'contract.a': { artifact: 'Xx', depends: ['contract.c'] },
        'contract.b': { artifact: 'Xx', depends: ['contract.c'] },
        'contract.c': { artifact: 'Xx', depends: ['contract.f', 'contract.e'] },
        'contract.d': { artifact: 'Xx', depends: ['contract.f'] },
        'contract.e': { artifact: 'Xx', depends: [] },
        'contract.f': { artifact: 'Xx', depends: [] },
        'contract.g': { artifact: 'Xx', depends: ['contract.h'] },
        'contract.h': { artifact: 'Xx', depends: [] },
      });

      const lines = def.printTopology();

      expect(lines).toEqual([
        '┌────────────┐     ┌────────────┐',
        '│ contract.g │─────│ contract.h │',
        '└────────────┘     └────────────┘',
        '┌────────────┐     ┌────────────┐     ┌────────────┐',
        '│ contract.a │─────│ contract.c │──┬──│ contract.e │',
        '│ contract.b │     │ contract.d │  │  └────────────┘',
        '└────────────┘     └────────────┘  │  ┌────────────┐',
        '                                   └──│ contract.f │',
        '                                      └────────────┘',
      ]);
    });
  });
});
