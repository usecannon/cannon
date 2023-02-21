import { CannonRegistry, OnChainRegistry } from './registry';

describe('registry.ts', () => {
  describe('CannonRegistry', () => {
    describe('getUrl()', () => {
      it('applies url alteration for "@" prefixed cannon packages', async () => {

      });
    });
  });

  describe('OnChainRegistry', () => {
    describe('constructor', () => {
      it('sets fields with signer', async () => {

      });

      it('sets fields with provider', async () => {

      });
    });

    describe('publish()', () => {
      it('throws if signer is not specified', async () => {
      });

      it('checks signer balance', async () => {

      });

      it('makes call to register all specified packages, and returns list of published packages', async () => {

      });
    });

    describe('getUrl()', () => {
      it('calls (and returns) from super first', async () => {

      });

      it('calls `getPackageUrl`', async () => {

      });
    });
  });
});
