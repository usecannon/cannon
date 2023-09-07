import fs from 'node:fs';
import _ from 'lodash';
import { ethers } from 'ethers';
import { JsonFragment } from '@ethersproject/abi';
import { TransactionResponse } from '@ethersproject/abstract-provider';
import { ChainBuilderContextWithHelpers, ChainBuilderRuntimeInfo } from '../src/types';
import { ChainBuilderRuntime } from '../src/runtime';
import { CannonWrapperGenericProvider, InMemoryRegistry } from '../src';

const Greeter = JSON.parse(fs.readFileSync(`${__dirname}/data/Greeter.json`).toString());

export const fixtureAddress = () => ethers.Wallet.createRandom().address;
export const fixtureTxHash = () => ethers.utils.keccak256(Buffer.from(Math.random().toString()));

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
    ethers.utils,
    ethers.constants,
    overrides
  ) as ChainBuilderContextWithHelpers;

export const fixtureContractArtifact = (contractName = 'Greeter') => ({
  contractName,
  sourceName: `contracts/${contractName}.sol`,
  abi: _.cloneDeep(Greeter.abi) as JsonFragment[],
  bytecode: Greeter.bytecode.object as string,
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
  };
};

export const fixtureRuntimeInfo = () => {
  const provider = new ethers.providers.JsonRpcProvider();

  return {
    provider: new CannonWrapperGenericProvider({}, provider),
    chainId: 13370,
    getSigner: async (addr: string) => provider.getSigner(addr) as ethers.Signer,
    getDefaultSigner: async () => provider.getSigner((await provider.listAccounts())[0]),
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

export const fixtureSigner = () => ethers.Wallet.createRandom();

export async function mockDeployTransaction(signer: ethers.Signer) {
  const hash = fixtureTxHash();

  const rx = {
    contractAddress: fixtureAddress(),
    transactionHash: hash,
    logs: [],
  };

  const tx = {
    hash,
    from: await signer.getAddress(),
    wait: jest.fn().mockResolvedValue(rx),
  };

  jest.spyOn(signer, 'sendTransaction').mockResolvedValue(tx as unknown as TransactionResponse);

  return { tx, rx };
}
