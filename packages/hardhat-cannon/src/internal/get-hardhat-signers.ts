import { ethers } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

export function getHardhatSigners(hre: HardhatRuntimeEnvironment, provider: ethers.providers.Provider) {
  const accounts = hre.network.config.accounts;

  if (Array.isArray(accounts)) {
    return accounts.map(account => new hre.ethers.Wallet(typeof account === 'string' ? account : account.privateKey));
  } else if (accounts === 'remote') {
    throw new Error('Remote accounts configuration not implemented with cannon');
  } else {
    const signers: ethers.Signer[] = [];

    for (let i = 0; i < accounts.count; i++) {
      signers.push(
        hre.ethers.Wallet.fromMnemonic(accounts.mnemonic, accounts.path + `/${i + accounts.initialIndex}`).connect(provider)
      );
    }

    return signers;
  }
}
