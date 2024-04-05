import * as viem from 'viem';
import { Abi, Address, Hash, Hex, SendTransactionParameters } from 'viem';

import _ from 'lodash';

import type { RawChainDefinition } from './actions';

// loosely based on the hardhat `Artifact` type
export type ContractArtifact = {
  contractName: string;
  sourceName: string;
  abi: Abi;
  bytecode: Hex;
  deployedBytecode: string;
  linkReferences: {
    [fileName: string]: {
      [contractName: string]: {
        start: number;
        length: number;
      }[];
    };
  };
  source?: {
    solcVersion: string;
    input: string;
  };
};

export type ContractData = {
  address: Address;
  abi: Abi;
  constructorArgs?: any[]; // only needed for external verification
  linkedLibraries?: { [sourceName: string]: { [libName: string]: string } }; // only needed for external verification
  deployTxnHash: string;
  contractName: string;
  sourceName: string;
  deployedOn: string;
  highlight?: boolean;
  gasUsed: number;
  gasCost: string;
};

export type ContractMap = {
  [label: string]: ContractData;
};

export type TransactionMap = {
  [label: string]: {
    hash: Hash;
    events: EventMap;
    deployedOn: string;
    gasUsed: number;
    gasCost: string;
    signer: string;
  };
};

export type EventMap = {
  [name: string]: {
    args: string[];
  }[];
};

export interface PreChainBuilderContext {
  chainId: number;

  package: any;

  timestamp: string;

  overrideSettings: { [label: string]: string };
}

export interface ChainBuilderContext extends PreChainBuilderContext {
  contracts: ContractMap;

  txns: TransactionMap;

  settings: { [label: string]: string };

  // Legacy
  extras?: { [label: string]: string };

  imports: BundledChainBuilderOutputs;

  [shortContract: string]: any;
}

const etherUnitNames = ['wei', 'kwei', 'mwei', 'gwei', 'szabo', 'finney', 'ether'];

export const CannonHelperContext = {
  // ethers style constants
  AddressZero: viem.zeroAddress,
  HashZero: viem.zeroHash,
  MaxUint256: viem.maxUint256,

  // ethers style utils
  defaultAbiCoder: {
    encode: (a: string[], v: any[]) => {
      return viem.encodeAbiParameters(
        a.map((arg) => ({ type: arg })),
        v
      );
    },
    decode: (a: string[], v: viem.Hex | viem.ByteArray) => {
      return viem.decodeAbiParameters(
        a.map((arg) => ({ type: arg })),
        v
      );
    },
  },

  zeroPad: (a: viem.Hex, s: number) => viem.padHex(a, { size: s }),
  hexZeroPad: (a: viem.Hex, s: number) => viem.padHex(a, { size: s }),
  hexlify: viem.toHex,
  stripZeros: viem.trim,
  formatBytes32String: (v: string) => viem.stringToHex(v, { size: 32 }),
  parseBytes32String: (v: viem.Hex) => viem.hexToString(v, { size: 32 }),
  id: (v: string) => (v.startsWith('function ') ? viem.toFunctionSelector(v) : viem.keccak256(viem.toHex(v))),
  formatEther: viem.formatEther,
  formatUnits: (s: bigint, units: number | string) => {
    if (typeof units === 'string') {
      const index = etherUnitNames.indexOf(units);
      if (index < 0) {
        throw new Error(`formatUnits: unknown ethereum unit name: ${units}`);
      }
      units = 3 * index;
    }

    return viem.formatUnits(s, units as number);
  },
  parseEther: viem.parseEther,
  parseUnits: (s: string, units: number | string) => {
    if (typeof units === 'string') {
      const index = etherUnitNames.indexOf(units);
      if (index < 0) {
        throw new Error(`parseUnits: unknown ethereum unit name: ${units}`);
      }
      units = 3 * index;
    }

    return viem.parseUnits(s, units as number);
  },
  keccak256: viem.keccak256,
  sha256: viem.sha256,
  ripemd160: viem.ripemd160,
  solidityPack: viem.encodePacked,
  solidityKeccak256: (a: string[], v: any[]) => viem.keccak256(viem.encodePacked(a, v)),
  soliditySha256: (a: string[], v: any[]) => viem.sha256(viem.encodePacked(a, v)),
  serializeTransaction: viem.serializeTransaction,
  parseTransaction: viem.parseTransaction,
};

export type ChainBuilderContextWithHelpers = ChainBuilderContext & typeof CannonHelperContext;

export type BuildOptions = { [val: string]: string };

export type StorageMode = 'all' | 'metadata' | 'none';

export type CannonSigner = { wallet: viem.WalletClient; address: Address };

export type Contract = Pick<viem.SimulateContractParameters, 'abi' | 'address'>;

export interface ChainBuilderRuntimeInfo {
  // Interface to which all transactions should be sent and all state queried
  provider: viem.PublicClient;

  // chainID to interact with
  chainId: number;

  // returns the signer associated with the given address. Reverts if the signer is not found or cannot be populated.
  getSigner: (addr: viem.Address) => Promise<CannonSigner>;

  // returns a signer which should be used for sending the specified transaction.
  getDefaultSigner?: (txn: Omit<SendTransactionParameters, 'account' | 'chain'>, salt?: string) => Promise<CannonSigner>;

  // returns contract information from the specified artifact name.
  getArtifact?: (name: string) => Promise<ContractArtifact>;

  // Should record snapshots?
  snapshots: boolean;

  // Should gracefully continue after failures and return a partial release?
  allowPartialDeploy: boolean;

  // Gas price to use for transactions
  gasPrice?: string;

  // Base and Priority gas fee to use for transactions - EIP1559
  gasFee?: string;
  priorityGasFee?: string;
}

export interface PackageState {
  name: string;
  version: string;
  currentLabel: string;
}

export type BundledOutput = { url: string; tags?: string[]; preset?: string } & ChainArtifacts;

export interface BundledChainBuilderOutputs {
  [module: string]: BundledOutput;
}

export type ChainArtifacts = Partial<Pick<ChainBuilderContext, 'imports' | 'contracts' | 'txns' | 'settings' | 'extras'>>;

export interface ChainBuilderOptions {
  [key: string]: string;
}

/**
 * The deployment info is the main output of the cannon build process, and what is ultimately the blob referenced by the registry when pulling a package.
 * It contains all the information
 * needed to interface with a deployment generated by cannon.
 */
export type DeploymentInfo = {
  // used to identify that cannon created an artifact on IPFS
  generator: `cannon ${string}`;

  // the time at which this deployment was generated
  timestamp: number;

  // contents of cannonfile.toml used for this build in raw json form
  // if not included, defaults to the chain definition at the DeploymentManifest instead
  def: RawChainDefinition;

  // setting overrides used to build this chain
  options: ChainBuilderOptions;

  // defines whether this deployment has been fully completed or only partially or completely unbuilt
  status?: 'complete' | 'partial' | 'none';

  // the result of all the build steps for the last build
  state: DeploymentState;

  // additional package information. could be `package.json` file from a hardhat project, for example.
  meta: any;

  // ipfs hash additional required files for possible build
  miscUrl: string;

  // EVM chain which this deployment is for
  chainId?: number;
};

export type DeploymentManifest = {
  // contents of cannonfile.toml stringified
  def: RawChainDefinition;

  // npm style package.json for the project being uploaded
  npmPackage: any;

  // tag of the package which was used as the base for this package
  upgradeFrom?: string;

  // archive which contains miscellaneus dependencies ex. documentation pages, contracts, etc.
  misc: {
    ipfsHash: string;
  };

  deploys: {
    [chainId: string]: {
      [preset: string]: {
        hash: string;
      };
    };
  };
};

/**
 * After executing a build step, this object is recorded to the DeploymentInfo for future reference.
 */
export type StepState = {
  // The BUILD_VERSION when the step was built
  version: number;

  // A md5sum of the step inputs. Used to determine if the step should be rebuilt on upgrades.
  hash: string | null;

  // Once the step completes, the current state of the deployment artifacts is recorded
  artifacts: ChainArtifacts;

  // If this is a cannon network build, the full dump of the chain blob is recorded
  chainDump?: Hex | null; // only included if cannon network build
};

export type DeploymentState = { [label: string]: StepState };

export function combineCtx(ctxs: ChainBuilderContext[]): ChainBuilderContext {
  const ctx = _.clone(ctxs[0]);

  ctx.timestamp = Math.floor(Date.now() / 1000).toString(); //(await this.provider.getBlock(await this.provider.getBlockNumber())).timestamp.toString();

  // merge all blockchain outputs
  for (const additionalCtx of ctxs.slice(1)) {
    ctx.contracts = { ...ctx.contracts, ...additionalCtx.contracts };
    ctx.txns = { ...ctx.txns, ...additionalCtx.txns };
    ctx.imports = { ...ctx.imports, ...additionalCtx.imports };
    ctx.settings = { ...ctx.settings, ...additionalCtx.settings };
  }

  return ctx;
}
