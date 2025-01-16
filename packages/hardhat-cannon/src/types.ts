import type * as viem from 'viem';

export type CannonProvider = viem.PublicClient & viem.TestClient & viem.WalletClient;
