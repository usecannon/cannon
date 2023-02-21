import { build, buildLayer, getOutputs, runStep, createInitialContext } from './builder';

describe('builder.ts', () => {
  describe('build()', () => {
    it('checks chain definition', async () => {

    });

    describe('without layers', () => {
      it('returns correct state', async () => {

      });
    });

    describe('without layers and skipped steps', () => {
      it('returns correct (partial) state', async () => {

      });

      it('emits correct runtime events', async () => {

      });
    });
  });

  describe('buildLayer()', () => {
    it('runs steps depth first', async () => {

    });

    it('restores before each layer', async () => {

    });

    it('takes snapshots after layer', async () => {

    });

    it('does not duplicate building of a layer', async () => {

    });
  });

  describe('getOutputs()', () => {
    it('merges chain artifacts', async () => {

    });

    it('merges chain artifacts with nested imports', async () => {

    });
  });

  describe('runStep()', () => {
    it('emits on runtime', async () => {

    });
  });
  
  describe('createInitialContext()', () => {
    it('assembles correctly', async () => {

    });
  });
});
