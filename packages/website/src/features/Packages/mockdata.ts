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

export const mockResult = {
  commitmentTime: 1622549600, // Example UNIX timestamp
  request: {
    marketId: '123456789012345678', // Example market ID
    accountId: '987654321098765432', // Example account ID
    sizeDelta: '-1000000000000000', // Example size delta, negative for sell order
    settlementStrategyId: '1111222233334444', // Example settlement strategy ID
    acceptablePrice: '50000000000000000000', // Example price in wei (50 ETH)
    trackingCode: '0x636f6465636f6465636f6465636f6465636f6465636f6465636f6465636f6465', // Example bytes32 hex value
    referrer: '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1', // Example Ethereum address
  },
};
