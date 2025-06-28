import { Address } from 'viem';

// Contract addresses for different networks
export const CONTRACT_ADDRESSES = {
  // Mainnet
  1: {
    CANNON_REGISTRY: '0x8E5C7EFC9636A6A0408A46BB7F617094B81e5dba' as Address,
    CANNON_SUBSCRIPTION: '0x0000000000000000000000000000000000000000' as Address, // TODO: Add actual address
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address,
  },
  // Optimism
  10: {
    CANNON_REGISTRY: '0x8E5C7EFC9636A6A0408A46BB7F617094B81e5dba' as Address,
    CANNON_SUBSCRIPTION: '0x337D68596cEc15647f2710C9EdE2F48aB7f30657' as Address, // TODO: Add actual address
    USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85' as Address,
  },
  // Sepolia
  11155111: {
    CANNON_REGISTRY: '0x0000000000000000000000000000000000000000' as Address, // TODO: Add actual address
    CANNON_SUBSCRIPTION: '0x0000000000000000000000000000000000000000' as Address, // TODO: Add actual address
    USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as Address,
  },
} as const;

// CannonSubscription ABI
export const CANNON_SUBSCRIPTION_ABI = [
  {
    inputs: [
      {
        internalType: 'uint16',
        name: '_planId',
        type: 'uint16',
      },
    ],
    name: 'getPlan',
    outputs: [
      {
        components: [
          {
            internalType: 'uint256',
            name: 'price',
            type: 'uint256',
          },
          {
            internalType: 'uint16',
            name: 'id',
            type: 'uint16',
          },
          {
            internalType: 'uint32',
            name: 'duration',
            type: 'uint32',
          },
          {
            internalType: 'uint32',
            name: 'quota',
            type: 'uint32',
          },
          {
            internalType: 'uint16',
            name: 'minTerms',
            type: 'uint16',
          },
          {
            internalType: 'uint16',
            name: 'maxTerms',
            type: 'uint16',
          },
          {
            internalType: 'bool',
            name: 'active',
            type: 'bool',
          },
          {
            internalType: 'bool',
            name: 'refundable',
            type: 'bool',
          },
        ],
        internalType: 'struct Subscription.Plan',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_user',
        type: 'address',
      },
    ],
    name: 'getAvailablePlans',
    outputs: [
      {
        internalType: 'uint16[]',
        name: '',
        type: 'uint16[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_user',
        type: 'address',
      },
    ],
    name: 'getMembership',
    outputs: [
      {
        components: [
          {
            internalType: 'uint16',
            name: 'planId',
            type: 'uint16',
          },
          {
            internalType: 'uint32',
            name: 'activeFrom',
            type: 'uint32',
          },
          {
            internalType: 'uint32',
            name: 'activeUntil',
            type: 'uint32',
          },
          {
            internalType: 'uint32',
            name: 'availableCredits',
            type: 'uint32',
          },
        ],
        internalType: 'struct Subscription.Membership',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_user',
        type: 'address',
      },
    ],
    name: 'hasActiveMembership',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint16',
        name: '_planId',
        type: 'uint16',
      },
      {
        internalType: 'uint32',
        name: '_amountOfTerms',
        type: 'uint32',
      },
    ],
    name: 'purchaseMembership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'cancelMembership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'TOKEN',
    outputs: [
      {
        internalType: 'contract IERC20',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'VAULT',
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
] as const;

// ERC20 ABI for token interactions
export const ERC20_ABI = [
  {
    inputs: [
      {
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
    ],
    name: 'balanceOf',
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
    inputs: [
      {
        internalType: 'address',
        name: 'spender',
        type: 'address',
      },
    ],
    name: 'allowance',
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
    inputs: [
      {
        internalType: 'address',
        name: 'spender',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'approve',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;
