import fs from 'node:fs';
import _ from 'lodash';
import viem, { Address } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { ChainBuilderContextWithHelpers, ChainBuilderRuntimeInfo } from '../src/types';
import { ChainBuilderRuntime } from '../src/runtime';
import { CannonHelperContext, CannonSigner, InMemoryRegistry } from '../src';

const Greeter = JSON.parse(fs.readFileSync(`${__dirname}/data/Greeter.json`).toString());

export const fixtureAddress = () => privateKeyToAccount(generatePrivateKey()).address;
export const fixtureTxHash = () => viem.keccak256(Buffer.from(Math.random().toString()));

export const fixtureCtx = (overrides: Partial<ChainBuilderContextWithHelpers> = {}) =>
  _.merge(
    {
      settings: {},
      contracts: {},
      txns: {},
      extras: {},
      imports: {},
      chainId: 1234,
      package: {},
      timestamp: '1234123412',
    },
    CannonHelperContext,
    overrides
  ) as ChainBuilderContextWithHelpers;

export const fixtureContractArtifact = (contractName = 'Greeter') => ({
  contractName,
  sourceName: `contracts/${contractName}.sol`,
  abi: _.cloneDeep(Greeter.abi) as viem.Abi,
  bytecode: Greeter.bytecode.object as viem.Hex,
  deployedBytecode: Greeter.deployedBytecode.object as string,
  linkReferences: {},
});

export const fixtureContractData = (contractName = 'Greeter') => {
  const artifact = fixtureContractArtifact(contractName);

  return {
    address: fixtureAddress(),
    abi: artifact.abi,
    deployTxnHash: fixtureTxHash(),
    contractName: artifact.contractName,
    sourceName: artifact.sourceName,
    deployedOn: `contract.${artifact.contractName}`,
    gasCost: '0',
    gasUsed: 0,
  };
};

export const fixtureRuntimeInfo = () => {
  const provider = viem.createPublicClient({ transport: viem.custom({} as any)});

  return {
    provider,
    chainId: 13370,
    getSigner: async (addr: Address) => ({ address: addr, wallet: provider as any}),
    getDefaultSigner: async () => ({ address: fixtureAddress(), wallet: provider as any}),
    getArtifact: async (contractName: string) => fixtureContractArtifact(contractName),
    snapshots: false,
    allowPartialDeploy: false,
  } satisfies ChainBuilderRuntimeInfo;
};

export const fixtureRuntime = (
  info: ConstructorParameters<typeof ChainBuilderRuntime>[0] = fixtureRuntimeInfo(),
  registry: ConstructorParameters<typeof ChainBuilderRuntime>[1] = new InMemoryRegistry(),
  loaders?: ConstructorParameters<typeof ChainBuilderRuntime>[2],
  defaultLoaderScheme?: ConstructorParameters<typeof ChainBuilderRuntime>[3]
) => new ChainBuilderRuntime(info, registry, loaders, defaultLoaderScheme);

export const fixtureSigner = () => { 
  const acct = privateKeyToAccount(generatePrivateKey());

  return { address: acct.address, wallet: viem.createWalletClient({ account: acct, transport: viem.custom({} as any)})};
}

export async function mockDeployTransaction(signer: CannonSigner) {
  const hash = fixtureTxHash();

  const rx = {
    contractAddress: fixtureAddress(),
    transactionHash: hash,
    gasUsed: BigInt(0),
    effectiveGasPrice: 0,
    logs: [],
  };

  const tx = {
    hash,
    from: signer.address,
    wait: jest.fn().mockResolvedValue(rx),
  };

  //jest.spyOn(signer, 'sendTransaction').mockResolvedValue(tx as unknown as TransactionResponse);

  return { tx, rx };
}
