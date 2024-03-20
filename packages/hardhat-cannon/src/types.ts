import type * as viem from 'viem';
import type { ChainBuilderContext } from '@usecannon/builder';

export type BuildOutputs = Partial<Pick<ChainBuilderContext, 'imports' | 'contracts' | 'txns' | 'settings'>>;
export type CannonProvider = viem.PublicClient & viem.TestClient & viem.WalletClient;
