import hre from 'hardhat';

export async function exec(address: string, msg: string) {
  const contract = await hre.ethers.getContractAt('Greeter', address);

  const txn = await contract.setGreeting(msg);
  const receipt = await txn.wait();

  return { hash: receipt.transactionHash };
}
