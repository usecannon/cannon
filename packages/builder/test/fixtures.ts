import fs from 'node:fs';
import _ from 'lodash';
import * as viem from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { CannonHelperContext, CannonSigner, InMemoryRegistry } from '../src';
import { ChainBuilderRuntime } from '../src/runtime';
import { ChainBuilderContextWithHelpers, ChainBuilderRuntimeInfo } from '../src/types';

const Greeter = JSON.parse(fs.readFileSync(`${__dirname}/data/Greeter.json`).toString());

export const fixtureAddress = () => privateKeyToAccount(generatePrivateKey()).address;
export const fixtureTxHash = () => viem.keccak256(Buffer.from(Math.random().toString()));

export function fixtureTransactionReceipt(attrs: Partial<viem.TransactionReceipt> = {}) {
  return {
    blockHash: fixtureTxHash(),
    blockNumber: BigInt(0),
    from: fixtureAddress(),
    to: fixtureAddress(),
    transactionHash: fixtureTxHash(),
    logsBloom: '0x',
    transactionIndex: 1,
    contractAddress: fixtureAddress(),
    gasUsed: BigInt(1234),
    logs: [],
    status: 'success',
    effectiveGasPrice: BigInt(5678),
    cumulativeGasUsed: BigInt(567856785678),
    type: 'eip1559',
    ...attrs,
  } satisfies viem.TransactionReceipt;
}

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
  const provider = viem.createPublicClient({ transport: viem.custom({} as any) });

  return {
    provider,
    chainId: 13370,
    getSigner: async (addr: viem.Address) => ({ address: addr, wallet: provider as any }),
    getDefaultSigner: async () => ({ address: fixtureAddress(), wallet: provider as any }),
    getArtifact: async (contractName: string) => fixtureContractArtifact(contractName),
    snapshots: false,
    allowPartialDeploy: false,
    subpkgDepth: 0,
  } satisfies ChainBuilderRuntimeInfo;
};

export const fixtureRuntime = (
  info: ConstructorParameters<typeof ChainBuilderRuntime>[0] = fixtureRuntimeInfo(),
  registry: ConstructorParameters<typeof ChainBuilderRuntime>[1] = new InMemoryRegistry(),
  loaders?: ConstructorParameters<typeof ChainBuilderRuntime>[2],
  defaultLoaderScheme?: ConstructorParameters<typeof ChainBuilderRuntime>[3]
) => new ChainBuilderRuntime(info, registry, loaders, defaultLoaderScheme);

export function makeFakeProvider(): viem.PublicClient & viem.WalletClient & viem.TestClient {
  const fakeProvider = viem
    .createTestClient({
      mode: 'anvil',
      transport: viem.custom({
        request: async () => {
          // do nothing
        },
      }),
    })
    .extend(viem.publicActions)
    .extend(viem.walletActions);

  for (const p in fakeProvider) {
    if ((typeof (fakeProvider as any)[p] as any) === 'function') {
      (fakeProvider as any)[p] = jest.fn();
    }
  }

  return fakeProvider as any;
}

export const fixtureSigner = (provider: viem.WalletClient = makeFakeProvider()) => {
  const acct = privateKeyToAccount(generatePrivateKey());

  return { address: acct.address, wallet: provider };
};

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
