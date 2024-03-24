import * as viem from 'viem';

export default [
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'FeeRequired',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'implementation',
        type: 'address',
      },
    ],
    name: 'ImplementationIsSterile',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'name',
        type: 'bytes32',
      },
    ],
    name: 'InvalidName',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidTags',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'url',
        type: 'string',
      },
    ],
    name: 'InvalidUrl',
    type: 'error',
  },
  {
    inputs: [],
    name: 'NoChange',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'contr',
        type: 'address',
      },
    ],
    name: 'NotAContract',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'addr',
        type: 'address',
      },
    ],
    name: 'NotNominated',
    type: 'error',
  },
  {
    inputs: [],
    name: 'PackageNotFound',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'addr',
        type: 'address',
      },
    ],
    name: 'Unauthorized',
    type: 'error',
  },
  {
    inputs: [],
    name: 'Unauthorized',
    type: 'error',
  },
  {
    inputs: [],
    name: 'UpgradeSimulationFailed',
    type: 'error',
  },
  {
    inputs: [],
    name: 'WrongChain',
    type: 'error',
  },
  {
    inputs: [],
    name: 'ZeroAddress',
    type: 'error',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'oldOwner',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'OwnerChanged',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'OwnerNominated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'name',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
    ],
    name: 'PackageOwnerChanged',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'name',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'currentOwner',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'nominatedOwner',
        type: 'address',
      },
    ],
    name: 'PackageOwnerNominated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'name',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'tag',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'variant',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'deployUrl',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'metaUrl',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
    ],
    name: 'PackagePublish',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'name',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'registrant',
        type: 'address',
      },
    ],
    name: 'PackageRegistered',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'name',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'tag',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'variant',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
    ],
    name: 'PackageUnpublish',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'name',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'verifier',
        type: 'address',
      },
    ],
    name: 'PackageUnverify',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'name',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'verifier',
        type: 'address',
      },
    ],
    name: 'PackageVerify',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'self',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'implementation',
        type: 'address',
      },
    ],
    name: 'Upgraded',
    type: 'event',
  },
  {
    inputs: [],
    name: 'MIN_PACKAGE_NAME_LENGTH',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'acceptOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_packageName',
        type: 'bytes32',
      },
    ],
    name: 'getAdditionalPublishers',
    outputs: [
      {
        internalType: 'address[]',
        name: 'additionalDeployers',
        type: 'address[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getImplementation',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_packageName',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: '_packageVersionName',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: '_packageVariant',
        type: 'bytes32',
      },
    ],
    name: 'getPackageMeta',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_packageName',
        type: 'bytes32',
      },
    ],
    name: 'getPackageNominatedOwner',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_packageName',
        type: 'bytes32',
      },
    ],
    name: 'getPackageOwner',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_packageName',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: '_packageVersionName',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: '_packageVariant',
        type: 'bytes32',
      },
    ],
    name: 'getPackageUrl',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'newNominatedOwner',
        type: 'address',
      },
    ],
    name: 'nominateNewOwner',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_packageName',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: '_newPackageOwner',
        type: 'address',
      },
    ],
    name: 'nominatePackageOwner',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'nominatedOwner',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_packageName',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: '_variant',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32[]',
        name: '_packageTags',
        type: 'bytes32[]',
      },
      {
        internalType: 'string',
        name: '_packageDeployUrl',
        type: 'string',
      },
      {
        internalType: 'string',
        name: '_packageMetaUrl',
        type: 'string',
      },
    ],
    name: 'publish',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'publishFee',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'registerFee',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'renounceNomination',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_packageName',
        type: 'bytes32',
      },
      {
        internalType: 'address[]',
        name: '_additionalDeployers',
        type: 'address[]',
      },
    ],
    name: 'setAdditionalPublishers',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_publishFee',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_registerFee',
        type: 'uint256',
      },
    ],
    name: 'setFees',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_packageName',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: '_owner',
        type: 'address',
      },
    ],
    name: 'setPackageOwnership',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'newImplementation',
        type: 'address',
      },
    ],
    name: 'simulateUpgradeTo',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_packageName',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: '_variant',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32[]',
        name: '_packageTags',
        type: 'bytes32[]',
      },
    ],
    name: 'unpublish',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_packageName',
        type: 'bytes32',
      },
    ],
    name: 'unverifyPackage',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_newImplementation',
        type: 'address',
      },
    ],
    name: 'upgradeTo',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_name',
        type: 'bytes32',
      },
    ],
    name: 'validatePackageName',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_packageName',
        type: 'bytes32',
      },
    ],
    name: 'verifyPackage',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] satisfies viem.Abi;
