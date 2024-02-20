import type * as viem from 'viem';
import type { ChainBuilderContext } from '@usecannon/builder';

export type BuildOutputs = Partial<Pick<ChainBuilderContext, 'imports' | 'contracts' | 'txns' | 'extras'>>;
export type CannonProvider = viem.PublicClient & viem.TestClient & viem.WalletClient;
