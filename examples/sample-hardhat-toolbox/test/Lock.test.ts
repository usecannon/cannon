import { rejects } from 'node:assert/strict';
import hre from 'hardhat';

import type * as viem from 'viem';

describe('Lock', function () {
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

  it('should allow the user to withdraw', async function () {
    const { address, abi } = hre.cannon.getContract('Lock');
    await provider.simulateContract({
      account: signers[0],
      address,
      abi,
      functionName: 'withdraw',
    });
  });
});
