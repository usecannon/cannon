import { match, rejects } from 'node:assert/strict';
import hre from 'hardhat';

import type { Lock } from '../typechain-types';
import type ethers from 'ethers';
import type * as viem from 'viem';

describe('Lock', function () {
  let provider: ethers.BrowserProvider;
  let owner: ethers.Signer;
  let user: ethers.Signer;
  let Lock: Lock;

  before('create provider', async function () {
    const { address, abi } = hre.cannon.getContract('Lock');
    const signers = await hre.ethers.getSigners();

    provider = new hre.ethers.BrowserProvider(hre.cannon.provider) as ethers.BrowserProvider;
    owner = signers[0].connect(provider as any);
    user = signers[1].connect(provider as any);

    Lock = new hre.ethers.Contract(address, abi).connect(owner) as Lock;
  });

  it('should revert when not the owner', async function () {
    await rejects(
      () => Lock.connect(user).withdraw(),
      (err: any) => {
        match(err.info.error.message, /Unauthorized\("0x70997970C51812dc3A010C7d01b50e0d17dc79C8"\)/);
        return true;
      }
    );
  });

  it('should revert when not during unlock window', async function () {
    await rejects(
      () => Lock.connect(owner).withdraw(),
      (err: any) => {
        match(err.info.error.message, /InvalidUnlockTime/);
        return true;
      }
    );
  });

  describe("using cannon's viem providers", function () {
    let provider: viem.PublicClient & viem.TestClient & viem.WalletClient;
    let signers: viem.Account[];

    before('load', async function () {
      provider = hre.cannon.provider;
      signers = hre.cannon.signers;
    });

    it('should revert when not the owner', async function () {
      const { address, abi } = hre.cannon.getContract('Lock');
      await rejects(
        provider.simulateContract({
          account: signers[1],
          address,
          abi,
          functionName: 'withdraw',
        }),
        {
          name: 'Error',
          message: `transaction reverted in contract Lock: Unauthorized("${signers[1].address}")`,
        }
      );
    });
  });
});
