export const mockOutput = [
  {
    components: [
      {
        internalType: 'uint256',
        name: 'commitmentTime',
        type: 'uint256',
      },
      {
        components: [
          {
            internalType: 'uint128',
            name: 'marketId',
            type: 'uint128',
          },
          {
            internalType: 'uint128',
            name: 'accountId',
            type: 'uint128',
          },
          {
            internalType: 'int128',
            name: 'sizeDelta',
            type: 'int128',
          },
          {
            internalType: 'uint128',
            name: 'settlementStrategyId',
            type: 'uint128',
          },
          {
            internalType: 'uint256',
            name: 'acceptablePrice',
            type: 'uint256',
          },
          {
            internalType: 'bytes32',
            name: 'trackingCode',
            type: 'bytes32',
          },
          {
            internalType: 'address',
            name: 'referrer',
            type: 'address',
          },
        ],
        internalType: 'struct AsyncOrder.OrderCommitmentRequest',
        name: 'request',
        type: 'tuple',
      },
    ],
    internalType: 'struct AsyncOrder.Data',
    name: 'order',
    type: 'tuple',
  },
];

const mockResult1 = [
  {
    components: [
      {
        internalType: 'uint256',
        name: 'commitmentTime',
        type: 'uint256',
      },
      {
        components: [
          {
            internalType: 'uint128',
            name: 'marketId',
            type: 'uint128',
          },
          {
            internalType: 'uint128',
            name: 'accountId',
            type: 'uint128',
          },
          {
            internalType: 'int128',
            name: 'sizeDelta',
            type: 'int128',
          },
          {
            internalType: 'uint128',
            name: 'settlementStrategyId',
            type: 'uint128',
          },
          {
            internalType: 'uint256',
            name: 'acceptablePrice',
            type: 'uint256',
          },
          {
            internalType: 'bytes32',
            name: 'trackingCode',
            type: 'bytes32',
          },
          {
            internalType: 'address',
            name: 'referrer',
            type: 'address',
          },
        ],
        internalType: 'struct AsyncOrder.OrderCommitmentRequest',
        name: 'request',
        type: 'tuple',
      },
    ],
    internalType: 'struct AsyncOrder.Data',
    name: 'order',
    type: 'tuple',
  },
];

export const mockResult = {
  commitmentTime: 3,
  request: {
    acceptablePrice: ' ',
    accountId: ' ',
    marketId: '',
    referrer: '',
    settlementStrategyId: ' ',
    trackingCode: ' ',
  },
};
