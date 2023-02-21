import { ChainBuilderRuntime } from './runtime';

describe('runtime.ts', () => {
  describe('ChainBuilderRuntime', () => {
    describe('constructor', () => {
      it('sets values', async () => {

      });
    });

    describe('checkNetwork()', () => {
      it('throws if the chainId does not match', async () => {

      });
    });

    describe('loadState()', () => {
      it('does nothing if snapshots = false', async () => {

      });

      it('does calls hardhat_loadState if snapshots = true', async () => {

      });
    });

    describe('dumpState()', () => {
      it('does nothing if snapshots = false', async () => {

      });

      it('does calls hardhat_dumpState if snapshots = true', async () => {

      });
    });

    describe('clearNode()', () => {
      it('does nothing if snapshots = false', async () => {

      });

      it('does calls evm_revert and evm_snapshots if snapshots = true', async () => {

      });
    });

    describe('recordMisc()', () => {
      it('calls loader putMisc', async () => {

      });
    });

    describe('restoreMisc()', () => {
      it('does nothing if the loadedMisc url is the same', async () => {

      });

      it('calls readMisc if loadedMisc url is different, and sets to misc storage', async () => {

      });
    });

    describe('derive()', () => {
      it('is constructed with same values excluding the overridden properties', async () => {

      });
      
      it('forwards events', async () => {

      });
    });
  });
});
