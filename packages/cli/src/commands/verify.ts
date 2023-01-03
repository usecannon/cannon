import { ChainDefinition, getOutputs, IPFSChainBuilderRuntime } from '@usecannon/builder';
import { getChainId, setupAnvil, execPromise } from '../helpers';
import { createDefaultReadRegistry } from '../registry';
import { getProvider, runRpc } from '../rpc';
import { resolveCliSettings } from '../settings';

export async function verify(packageRef: string, apiKey: string, network: string) {
  await setupAnvil();
  const chainId = getChainId(network);

  // create temporary provider 
  // todo: really shouldn't be necessary
  const provider = getProvider(
    await runRpc({
     port: 30000 + Math.floor(Math.random() * 30000)
   }));

  const resolver = createDefaultReadRegistry(resolveCliSettings());
 
   const runtime = new IPFSChainBuilderRuntime({
     provider,
     chainId: (await provider.getNetwork()).chainId,
     async getSigner(addr: string) {
       // on test network any user can be conjured
       await provider.send('hardhat_impersonateAccount', [addr]);
       await provider.send('hardhat_setBalance', [addr, `0x${(1e22).toString(16)}`]);
       return provider.getSigner(addr);
     },
 
     baseDir: null,
     snapshots: false,
   }, resolveCliSettings().ipfsUrl, resolver);
 
   const deployData = await runtime.readDeploy(packageRef, 'main');

  const outputs = await getOutputs(runtime, new ChainDefinition(deployData.def), deployData.state);

  if (!outputs) {
    throw new Error('No chain outputs found. Has the requested chain already been built?');
  }

  for (const c in outputs.contracts) {
    console.log('Verifying contract:', c);
    try {
      const constructorArgs = outputs.contracts[c].constructorArgs?.map((arg) => `"${arg}"`).join(' '); // might need to prepend the constructor signature
      await execPromise(
        `forge verify-contract --chain-id ${chainId} --constructor-args $(cast abi-encode ${constructorArgs} ${outputs.contracts[c].address} ${outputs.contracts[c].sourceName}:${outputs.contracts[c].contractName} ${apiKey}`
      );
    } catch (err) {
      if ((err as Error).message.includes('Already Verified')) {
        console.log('Already verified');
      } else {
        throw err;
      }
    }
  }
}
