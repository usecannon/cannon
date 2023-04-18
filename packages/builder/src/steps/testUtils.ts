import { ChainBuilderRuntime } from '../runtime';
import { ChainBuilderContextWithHelpers } from '../types';

import { CannonWrapperGenericProvider } from '../error/provider';
import { ethers } from 'ethers';

jest.mock('../runtime');
jest.mock('../error/provider');

export const fakeCtx = {
  settings: {
    a: 'a',
    b: 'b',
    c: 'c',
    d: 'd',
  },
  contracts: {},
  txns: {},
  extras: {},
  imports: {},
  chainId: 1234,
  package: {},
  timestamp: '1234123412',
} as unknown as ChainBuilderContextWithHelpers;

export const fakeRuntime = new ChainBuilderRuntime({} as any, null as any);

(fakeRuntime as any).provider = new CannonWrapperGenericProvider({}, null as any);

export function makeFakeSigner(address: string) {
  const signer = new ethers.VoidSigner(address, fakeRuntime.provider);

  signer.sendTransaction = jest.fn().mockResolvedValue({
    hash: '0x1234',
    wait: jest.fn().mockResolvedValue({
      contractAddress: '0x2345234523452345234523452345234523452345',
      transactionHash: '0x1234',
      logs: [],
    }),
  });
  signer.signTransaction = jest.fn();
  signer.signMessage = jest.fn();

  return signer;
}

(fakeRuntime.getDefaultSigner as any) = jest
  .fn()
  .mockResolvedValue(makeFakeSigner('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'));
(fakeRuntime.getArtifact as any) = jest.fn().mockResolvedValue(null);
