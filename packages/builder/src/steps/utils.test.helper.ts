import { makeFakeProvider } from '../../test/fixtures';
import { BroadcastRequestBase } from '../broadcast';
import { ChainBuilderRuntime } from '../runtime';
import { CannonSigner, ChainBuilderContext } from '../types';

import * as viem from 'viem';

jest.mock('../runtime');

export const fakeCtx = {
  settings: {
    a: 'a',
    b: 'b',
    c: 'c',
    d: 'd',
    gasLimit: '20000',
  },
  contracts: {},
  txns: {},
  extras: {},
  imports: {},
  chainId: 1234,
  package: {},
  timestamp: '1234123412',
} as unknown as ChainBuilderContext;

export const fakeRuntime = new ChainBuilderRuntime({} as any, null as any, {});

// todo: may not be enough
(fakeRuntime as any).provider = makeFakeProvider();

export function makeFakeSigner(address: string, provider: viem.WalletClient = makeFakeProvider()) {
  return { address, wallet: provider };
}

(fakeRuntime.getDefaultSigner as any) = jest
  .fn()
  .mockResolvedValue(makeFakeSigner('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', fakeRuntime.provider as any));
(fakeRuntime.getArtifact as any) = jest.fn().mockResolvedValue(null);
// the runtime class is auto-mocked; route sendTransaction through the signer wallet and the fake provider
// so step tests keep asserting on the same mocks as before
(fakeRuntime.sendTransaction as any) = jest.fn(async (signer: CannonSigner, request: BroadcastRequestBase) => {
  const hash = await signer.wallet.sendTransaction(request as any);
  return fakeRuntime.provider.waitForTransactionReceipt({ hash });
});
