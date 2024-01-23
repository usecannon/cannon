import { ChainBuilderRuntime } from '../runtime';
import { ChainBuilderContextWithHelpers } from '../types';

import * as viem from 'viem';

jest.mock('../runtime');
jest.mock('../error/provider');

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
} as unknown as ChainBuilderContextWithHelpers;

export const fakeRuntime = new ChainBuilderRuntime({} as any, null as any, {});

// todo: may not be enough
(fakeRuntime as any).provider = viem.createPublicClient({ transport: viem.custom({} as any) });

export function makeFakeSigner(address: string) {
  const signer = {} as any;

  signer.sendTransaction = jest.fn().mockResolvedValue({
    hash: '0x1234',
    wait: jest.fn().mockResolvedValue({
      contractAddress: '0x2345234523452345234523452345234523452345',
      transactionHash: '0x1234',
      logs: [],
      gasUsed: BigInt(0),
      effectiveGasPrice: 0,
    }),
  });
  signer.signTransaction = jest.fn();
  signer.signMessage = jest.fn();

  return { address, wallet: signer };
}

(fakeRuntime.getDefaultSigner as any) = jest
  .fn()
  .mockResolvedValue(makeFakeSigner('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'));
(fakeRuntime.getArtifact as any) = jest.fn().mockResolvedValue(null);
