import { ChainDefinition, RawChainDefinition } from './definition';

import 'jest';
import _ from 'lodash';

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
        'contract.a': { depends: [] },
        'contract.b': { depends: ['contract.a'] },

        // order of deps is important here. dependency on `contract.d` will cause it to form a separate layer
        // which will then lead to a layer merge, one of the branch conditions
        'contract.c': { depends: ['contract.d', 'contract.a'] },
        'contract.d': { depends: [] },
      });

      const layers = def.getStateLayers();

      expect(layers['contract.a']).toEqual({
        actions: ['contract.a'],
        depending: [],
        depends: [],
      });

      expect(layers['contract.b']).toEqual(layers['contract.c']);

      expect(layers['contract.b'].actions).toEqual(['contract.b', 'contract.c']);

      expect(layers['contract.b'].depends).toEqual(['contract.a', 'contract.d']);
    });
  });
});
