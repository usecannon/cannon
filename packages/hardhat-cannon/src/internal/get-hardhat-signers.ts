import { EdrNetworkHDAccountsConfig, ResolvedConfigurationVariable } from 'hardhat/types/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types/hre';

import * as viem from 'viem';
import { mnemonicToAccount, privateKeyToAccount } from 'viem/accounts';

export async function getHardhatSigners(hre: HardhatRuntimeEnvironment /*, provider: viem.WalletClient*/): Promise<viem.Account[]> {
  const accounts = hre.config.networks[hre.globalOptions.network].accounts;
  let signers: viem.Account[] = [];

  if (Array.isArray(accounts)) {
    signers = (await Promise.all(accounts.map((k) => (k as ResolvedConfigurationVariable).getHexString()))).map((p) => privateKeyToAccount(p as `0x${string}`));
  } else if (accounts === 'remote') {
    // TODO
    //signers = hre.
  } else {
    const mnemonic = await (accounts as EdrNetworkHDAccountsConfig).mnemonic.get();
    signers = Array(accounts.count)
      .fill(0)
      .map((_, i) =>
        mnemonicToAccount(mnemonic, { path: (accounts.path + `/${i + accounts.initialIndex}`) as any }),
      );
  }

  return signers;
}
