import { ChainDefinition } from './definition';

import 'jest';
import _ from 'lodash';
import { RawChainDefinition } from './actions';

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
  describe('checkCycles()', () => {
    it('works when there are 0 nodes', async () => {
      const def = makeFakeChainDefinition({});
      expect(def.checkCycles()).toBeNull();
    });

    it('works when there are 4 nodes in a diamond with extraneous', async () => {
      const def = makeFakeChainDefinition({
        'contract.a': { depends: [] },
        'contract.b': { depends: ['contract.a'] },
        'contract.c': { depends: ['contract.a'] },
        'contract.d': { depends: ['contract.b', 'contract.c', 'contract.a'] },
      });
      expect(def.checkCycles()).toBeNull();
    });

    it('returns cycle when there is one node depending on itself', async () => {
      const def = makeFakeChainDefinition({ 'contract.a': { depends: ['contract.a'] } });
      expect(def.checkCycles()).toEqual(['contract.a']);
    });

    it('returns cycle when there are two nodes depending on each other', async () => {
      const def = makeFakeChainDefinition({
        'contract.a': { depends: ['contract.b'] },
        'contract.b': { depends: ['contract.a'] },
      });
      expect(def.checkCycles()).toEqual(['contract.b', 'contract.a']);
    });

    it('returns cycle when there are three nodes depending on each other with other conforming nodes', async () => {
      const def = makeFakeChainDefinition({
        'contract.a': { depends: [] },

        'contract.b': { depends: ['contract.c'] },
        'contract.c': { depends: ['contract.y'] },

        // cycle
        'contract.x': { depends: ['contract.y'] },
        'contract.y': { depends: ['contract.z'] },
        'contract.z': { depends: ['contract.x'] },
      });

      // based on the order of searching nodes, should enter the cycle on `contract.y`
      expect(def.checkCycles()).toEqual(['contract.z', 'contract.x', 'contract.y']);
    });
  });

  describe('checkExtraneous()', () => {
    it('works when there are four nodes in a diamond pattern', async () => {
      const def = makeFakeChainDefinition({
        'contract.a': { depends: [] },
        'contract.b': { depends: ['contract.a'] },
        'contract.c': { depends: ['contract.a'] },
        'contract.d': { depends: ['contract.b', 'contract.c'] },
      });

      expect(def.checkExtraneousDependencies()).toEqual([]);
    });

    it('works when there are four nodes in a diamond pattern with the 4th node depending on the first (extraneous)', async () => {
      const def = makeFakeChainDefinition({
        'contract.a': { depends: [] },
        'contract.b': { depends: ['contract.a'] },
        'contract.c': { depends: ['contract.a'] },
        'contract.d': { depends: ['contract.b', 'contract.c', 'contract.a'] },
      });

      expect(def.checkExtraneousDependencies()).toEqual([
        { node: 'contract.d', extraneous: 'contract.a', inDep: 'contract.b' },
      ]);
    });
  });

  describe('getStateLayers()', () => {
    it('works when there is just one node', async () => {
      const def = makeFakeChainDefinition({
        'contract.a': { depends: [] },
      });

      expect(def.getStateLayers()).toEqual({
        'contract.a': {
          actions: ['contract.a'],
          depending: [],
          depends: [],
        },
      });
    });

    it('works when there are three nodes in series', async () => {
      const def = makeFakeChainDefinition({
        'contract.a': { depends: [] },
        'contract.b': { depends: ['contract.a'] },
        'contract.c': { depends: ['contract.b'] },
      });

      expect(def.getStateLayers()).toEqual({
        'contract.a': {
          actions: ['contract.a'],
          depending: [],
          depends: [],
        },
        'contract.b': {
          actions: ['contract.b'],
          depending: [],
          depends: ['contract.a'],
        },
        'contract.c': {
          actions: ['contract.c'],
          depending: [],
          depends: ['contract.b'],
        },
      });
    });

    it('works when there are three nodes in triangle', async () => {
      const def = makeFakeChainDefinition({
        'contract.a': { depends: [] },
        'contract.b': { depends: ['contract.a'] },
        'contract.c': { depends: ['contract.a'] },
      });

      const layers = def.getStateLayers();

      expect(layers['contract.a']).toEqual({
        actions: ['contract.a'],
        depending: [],
        depends: [],
      });

      expect(layers['contract.b']).toEqual(layers['contract.c']);

      expect(layers['contract.b'].actions).toEqual(['contract.b', 'contract.c']);

      expect(layers['contract.b'].depends).toEqual(['contract.a']);
    });

    it('works when there are four nodes in a diamond pattern', async () => {
      const def = makeFakeChainDefinition({
        'contract.a': { depends: [] },
        'contract.b': { depends: ['contract.a'] },
        'contract.c': { depends: ['contract.a'] },
        'contract.d': { depends: ['contract.b', 'contract.c'] },
      });

      const layers = def.getStateLayers();

      expect(layers['contract.a']).toEqual({
        actions: ['contract.a'],
        depending: [],
        depends: [],
      });

      expect(layers['contract.b']).toEqual(layers['contract.c']);

      expect(layers['contract.b'].actions).toEqual(['contract.b', 'contract.c']);

      expect(layers['contract.b'].depends).toEqual(['contract.a']);

      expect(layers['contract.d']).toEqual({
        actions: ['contract.d'],
        depending: [],
        depends: ['contract.b'],
      });
    });

    it('works when there are four nodes in a diamond pattern with another side layer', async () => {
      const def = makeFakeChainDefinition({
        'contract.a': { depends: [] },
        'contract.b': { depends: ['contract.a'] },
        'contract.c': { depends: ['contract.a', 'contract.e'] },
        'contract.d': { depends: ['contract.b', 'contract.c'] },
        'contract.e': { depends: [] },
      });

      const layers = def.getStateLayers();

      expect(layers['contract.a']).toEqual({
        actions: ['contract.a'],
        depending: [],
        depends: [],
      });

      expect(layers['contract.e']).toEqual({
        actions: ['contract.e'],
        depending: [],
        depends: [],
      });

      expect(layers['contract.b']).toEqual(layers['contract.c']);

      expect(layers['contract.b'].actions).toEqual(['contract.b', 'contract.c']);

      expect(layers['contract.b'].depends).toEqual(['contract.a', 'contract.e']);

      expect(layers['contract.d']).toEqual({
        actions: ['contract.d'],
        depending: [],
        depends: ['contract.b'],
      });
    });

    it('works when merging multiple assembled layers together', async () => {
      const def = makeFakeChainDefinition({
        'contract.a': { depends: ['contract.c'] },
        'contract.b': { depends: ['contract.c'] },
        'contract.c': { depends: ['contract.f', 'contract.e'] },
        'contract.d': { depends: ['contract.f'] },
        'contract.e': { depends: [] },
        'contract.f': { depends: [] },
      });

      const layers = def.getStateLayers();

      expect(layers['contract.f']).toEqual({
        actions: ['contract.f'],
        depending: [],
        depends: [],
      });

      expect(layers['contract.c']).toEqual(layers['contract.d']);

      expect(layers['contract.c'].actions).toEqual(['contract.c', 'contract.d']);

      expect(layers['contract.c'].depends).toEqual(['contract.e', 'contract.f']);
    });

    it('works when nodes share multiple dependencies', async () => {
      const def = makeFakeChainDefinition({
        'contract.a': { depends: [] },
        'contract.b': { depends: [] },
        'contract.c': { depends: ['contract.a', 'contract.b'] },
        'contract.d': { depends: ['contract.a', 'contract.b'] },
      });

      const layers = def.getStateLayers();

      expect(layers['contract.a']).toEqual({
        actions: ['contract.a'],
        depending: [],
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
        'contract.d': { depends: [] },
        'contract.b': { depends: ['contract.d'] },
        'contract.c': { depends: ['contract.d'] },
        'contract.e': { depends: ['contract.c'] },
        'contract.f': { depends: ['contract.e'] },
        'contract.a': { depends: ['contract.b', 'contract.f'] },
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
        'contract.a': { depends: [] },
        'contract.b': { depends: [] },
        'contract.c': { depends: ['contract.a'] },
        'contract.d': { depends: ['contract.b'] },
        'contract.e': { depends: ['contract.a', 'contract.b'] },
      });

      const layers = def.getStateLayers();

      expect(layers['contract.a']).toEqual({
        actions: ['contract.a'],
        depending: [],
        depends: [],
      });

      expect(layers['contract.e']).toEqual(layers['contract.d']);
      expect(layers['contract.e']).toEqual(layers['contract.c']);

      // make sure no extra structures were created in the process
      expect(_.uniq(Object.values(layers))).toHaveLength(3);
    });
  });

  describe('printTopology()', () => {
    it('prints a complicated topology', () => {
      const def = makeFakeChainDefinition({
        'contract.a': { depends: ['contract.c'] },
        'contract.b': { depends: ['contract.c'] },
        'contract.c': { depends: ['contract.f', 'contract.e'] },
        'contract.d': { depends: ['contract.f'] },
        'contract.e': { depends: [] },
        'contract.f': { depends: [] },
        'contract.g': { depends: ['contract.h'] },
        'contract.h': { depends: [] },
      });

      const lines = def.printTopology();

      expect(lines).toEqual([
        '┌────────────┐     ┌────────────┐     ┌────────────┐',
        '│ contract.a │─────│ contract.c │──┬──│ contract.e │',
        '│ contract.b │     │ contract.d │  │  └────────────┘',
        '└────────────┘     └────────────┘  │  ┌────────────┐',
        '                                   └──│ contract.f │',
        '                                      └────────────┘',
        '┌────────────┐     ┌────────────┐',
        '│ contract.g │─────│ contract.h │',
        '└────────────┘     └────────────┘',
      ]);
    });
  });
});
