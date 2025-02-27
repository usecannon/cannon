export const SafeABI = [
  {
    type: 'constructor',
    payable: false,
    inputs: [],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'AddedOwner',
    inputs: [
      {
        type: 'address',
        name: 'owner',
        indexed: false,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'ApproveHash',
    inputs: [
      {
        type: 'bytes32',
        name: 'approvedHash',
        indexed: true,
      },
      {
        type: 'address',
        name: 'owner',
        indexed: true,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'ChangedFallbackHandler',
    inputs: [
      {
        type: 'address',
        name: 'handler',
        indexed: false,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'ChangedGuard',
    inputs: [
      {
        type: 'address',
        name: 'guard',
        indexed: false,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'ChangedThreshold',
    inputs: [
      {
        type: 'uint256',
        name: 'threshold',
        indexed: false,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'DisabledModule',
    inputs: [
      {
        type: 'address',
        name: 'module',
        indexed: false,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'EnabledModule',
    inputs: [
      {
        type: 'address',
        name: 'module',
        indexed: false,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'ExecutionFailure',
    inputs: [
      {
        type: 'bytes32',
        name: 'txHash',
        indexed: false,
      },
      {
        type: 'uint256',
        name: 'payment',
        indexed: false,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'ExecutionFromModuleFailure',
    inputs: [
      {
        type: 'address',
        name: 'module',
        indexed: true,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'ExecutionFromModuleSuccess',
    inputs: [
      {
        type: 'address',
        name: 'module',
        indexed: true,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'ExecutionSuccess',
    inputs: [
      {
        type: 'bytes32',
        name: 'txHash',
        indexed: false,
      },
      {
        type: 'uint256',
        name: 'payment',
        indexed: false,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'RemovedOwner',
    inputs: [
      {
        type: 'address',
        name: 'owner',
        indexed: false,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'SafeReceived',
    inputs: [
      {
        type: 'address',
        name: 'sender',
        indexed: true,
      },
      {
        type: 'uint256',
        name: 'value',
        indexed: false,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'SafeSetup',
    inputs: [
      {
        type: 'address',
        name: 'initiator',
        indexed: true,
      },
      {
        type: 'address[]',
        name: 'owners',
        indexed: false,
      },
      {
        type: 'uint256',
        name: 'threshold',
        indexed: false,
      },
      {
        type: 'address',
        name: 'initializer',
        indexed: false,
      },
      {
        type: 'address',
        name: 'fallbackHandler',
        indexed: false,
      },
    ],
  },
  {
    type: 'event',
    anonymous: false,
    name: 'SignMsg',
    inputs: [
      {
        type: 'bytes32',
        name: 'msgHash',
        indexed: true,
      },
    ],
  },
  {
    type: 'function',
    name: 'VERSION',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [],
    outputs: [
      {
        type: 'string',
      },
    ],
  },
  {
    type: 'function',
    name: 'addOwnerWithThreshold',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'owner',
      },
      {
        type: 'uint256',
        name: '_threshold',
      },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'approveHash',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'bytes32',
        name: 'hashToApprove',
      },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'approvedHashes',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [
      {
        type: 'address',
      },
      {
        type: 'bytes32',
      },
    ],
    outputs: [
      {
        type: 'uint256',
      },
    ],
  },
  {
    type: 'function',
    name: 'changeThreshold',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'uint256',
        name: '_threshold',
      },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'checkNSignatures',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [
      {
        type: 'bytes32',
        name: 'dataHash',
      },
      {
        type: 'bytes',
        name: 'data',
      },
      {
        type: 'bytes',
        name: 'signatures',
      },
      {
        type: 'uint256',
        name: 'requiredSignatures',
      },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'checkSignatures',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [
      {
        type: 'bytes32',
        name: 'dataHash',
      },
      {
        type: 'bytes',
        name: 'data',
      },
      {
        type: 'bytes',
        name: 'signatures',
      },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'disableModule',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'prevModule',
      },
      {
        type: 'address',
        name: 'module',
      },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'domainSeparator',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [],
    outputs: [
      {
        type: 'bytes32',
      },
    ],
  },
  {
    type: 'function',
    name: 'enableModule',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'module',
      },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'encodeTransactionData',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'to',
      },
      {
        type: 'uint256',
        name: 'value',
      },
      {
        type: 'bytes',
        name: 'data',
      },
      {
        type: 'uint8',
        name: 'operation',
      },
      {
        type: 'uint256',
        name: 'safeTxGas',
      },
      {
        type: 'uint256',
        name: 'baseGas',
      },
      {
        type: 'uint256',
        name: 'gasPrice',
      },
      {
        type: 'address',
        name: 'gasToken',
      },
      {
        type: 'address',
        name: 'refundReceiver',
      },
      {
        type: 'uint256',
        name: '_nonce',
      },
    ],
    outputs: [
      {
        type: 'bytes',
      },
    ],
  },
  {
    type: 'function',
    name: 'execTransaction',
    constant: false,
    stateMutability: 'payable',
    payable: true,
    inputs: [
      {
        type: 'address',
        name: 'to',
      },
      {
        type: 'uint256',
        name: 'value',
      },
      {
        type: 'bytes',
        name: 'data',
      },
      {
        type: 'uint8',
        name: 'operation',
      },
      {
        type: 'uint256',
        name: 'safeTxGas',
      },
      {
        type: 'uint256',
        name: 'baseGas',
      },
      {
        type: 'uint256',
        name: 'gasPrice',
      },
      {
        type: 'address',
        name: 'gasToken',
      },
      {
        type: 'address',
        name: 'refundReceiver',
      },
      {
        type: 'bytes',
        name: 'signatures',
      },
    ],
    outputs: [
      {
        type: 'bool',
        name: 'success',
      },
    ],
  },
  {
    type: 'function',
    name: 'execTransactionFromModule',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'to',
      },
      {
        type: 'uint256',
        name: 'value',
      },
      {
        type: 'bytes',
        name: 'data',
      },
      {
        type: 'uint8',
        name: 'operation',
      },
    ],
    outputs: [
      {
        type: 'bool',
        name: 'success',
      },
    ],
  },
  {
    type: 'function',
    name: 'execTransactionFromModuleReturnData',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'to',
      },
      {
        type: 'uint256',
        name: 'value',
      },
      {
        type: 'bytes',
        name: 'data',
      },
      {
        type: 'uint8',
        name: 'operation',
      },
    ],
    outputs: [
      {
        type: 'bool',
        name: 'success',
      },
      {
        type: 'bytes',
        name: 'returnData',
      },
    ],
  },
  {
    type: 'function',
    name: 'getChainId',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [],
    outputs: [
      {
        type: 'uint256',
      },
    ],
  },
  {
    type: 'function',
    name: 'getModulesPaginated',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'start',
      },
      {
        type: 'uint256',
        name: 'pageSize',
      },
    ],
    outputs: [
      {
        type: 'address[]',
        name: 'array',
      },
      {
        type: 'address',
        name: 'next',
      },
    ],
  },
  {
    type: 'function',
    name: 'getOwners',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [],
    outputs: [
      {
        type: 'address[]',
      },
    ],
  },
  {
    type: 'function',
    name: 'getStorageAt',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [
      {
        type: 'uint256',
        name: 'offset',
      },
      {
        type: 'uint256',
        name: 'length',
      },
    ],
    outputs: [
      {
        type: 'bytes',
      },
    ],
  },
  {
    type: 'function',
    name: 'getThreshold',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [],
    outputs: [
      {
        type: 'uint256',
      },
    ],
  },
  {
    type: 'function',
    name: 'getTransactionHash',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'to',
      },
      {
        type: 'uint256',
        name: 'value',
      },
      {
        type: 'bytes',
        name: 'data',
      },
      {
        type: 'uint8',
        name: 'operation',
      },
      {
        type: 'uint256',
        name: 'safeTxGas',
      },
      {
        type: 'uint256',
        name: 'baseGas',
      },
      {
        type: 'uint256',
        name: 'gasPrice',
      },
      {
        type: 'address',
        name: 'gasToken',
      },
      {
        type: 'address',
        name: 'refundReceiver',
      },
      {
        type: 'uint256',
        name: '_nonce',
      },
    ],
    outputs: [
      {
        type: 'bytes32',
      },
    ],
  },
  {
    type: 'function',
    name: 'isModuleEnabled',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'module',
      },
    ],
    outputs: [
      {
        type: 'bool',
      },
    ],
  },
  {
    type: 'function',
    name: 'isOwner',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'owner',
      },
    ],
    outputs: [
      {
        type: 'bool',
      },
    ],
  },
  {
    type: 'function',
    name: 'nonce',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [],
    outputs: [
      {
        type: 'uint256',
      },
    ],
  },
  {
    type: 'function',
    name: 'removeOwner',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'prevOwner',
      },
      {
        type: 'address',
        name: 'owner',
      },
      {
        type: 'uint256',
        name: '_threshold',
      },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'requiredTxGas',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'to',
      },
      {
        type: 'uint256',
        name: 'value',
      },
      {
        type: 'bytes',
        name: 'data',
      },
      {
        type: 'uint8',
        name: 'operation',
      },
    ],
    outputs: [
      {
        type: 'uint256',
      },
    ],
  },
  {
    type: 'function',
    name: 'setFallbackHandler',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'handler',
      },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'setGuard',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'guard',
      },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'setup',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'address[]',
        name: '_owners',
      },
      {
        type: 'uint256',
        name: '_threshold',
      },
      {
        type: 'address',
        name: 'to',
      },
      {
        type: 'bytes',
        name: 'data',
      },
      {
        type: 'address',
        name: 'fallbackHandler',
      },
      {
        type: 'address',
        name: 'paymentToken',
      },
      {
        type: 'uint256',
        name: 'payment',
      },
      {
        type: 'address',
        name: 'paymentReceiver',
      },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'signedMessages',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [
      {
        type: 'bytes32',
      },
    ],
    outputs: [
      {
        type: 'uint256',
      },
    ],
  },
  {
    type: 'function',
    name: 'simulateAndRevert',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'targetContract',
      },
      {
        type: 'bytes',
        name: 'calldataPayload',
      },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'swapOwner',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'prevOwner',
      },
      {
        type: 'address',
        name: 'oldOwner',
      },
      {
        type: 'address',
        name: 'newOwner',
      },
    ],
    outputs: [],
  },
] as const;
