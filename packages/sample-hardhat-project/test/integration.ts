import hre, { ethers } from 'hardhat';

async function doTest() {
  const { outputs } = await hre.run('cannon:build');
  const { signers, provider, node } = await hre.run('cannon:run', {
    packageNames: [`greeter:${outputs.package.version}`],
    logs: true,
  });

  const [signer] = signers;

  const contract = new ethers.Contract(
    outputs.contracts.greeter.address,
    outputs.contracts.greeter.abi,
    provider.getSigner(signer.address)
  );

  try {
    await contract.doCloning();
  } catch (err) {
    console.error('got error:', await err);
  } finally {
    node.kill();
  }
}

doTest().catch((err) => {
  console.error(err);
  process.exit(1);
});
