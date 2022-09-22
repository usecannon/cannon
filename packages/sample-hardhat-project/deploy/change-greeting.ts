import hre from 'hardhat';

// first arg is chainbuilder runtime, which is here unused
export async function exec(_: unknown, address: string, msg: string) {
  const contract = await hre.ethers.getContractAt('Greeter', address);

  const txn = await contract.setGreeting(msg);
  const receipt = await txn.wait();

  return { hash: receipt.transactionHash };
}
