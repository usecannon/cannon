import { encodeAbiParameters, encodeFunctionData, encodePacked, keccak256 } from 'viem';
import SafeABI from '@/abi/Safe.json';
import { SafeDefinition } from '@/helpers/store';
import { SafeTransaction } from '@/types/SafeTransaction';

const SimulateAccessorABI = [
  { inputs: [], stateMutability: 'nonpayable', type: 'constructor' },
  {
    inputs: [
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'value', type: 'uint256' },
      { internalType: 'bytes', name: 'data', type: 'bytes' },
      { internalType: 'enum Enum.Operation', name: 'operation', type: 'uint8' },
    ],
    name: 'simulate',
    outputs: [
      { internalType: 'uint256', name: 'estimate', type: 'uint256' },
      { internalType: 'bool', name: 'success', type: 'bool' },
      { internalType: 'bytes', name: 'returnData', type: 'bytes' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

const SAFE_DOMAIN_SEPARATOR_TYPEHASH = '0x47e79534a245952e8b16893a336b85a3d9ea9fa8c573f3d803afb92a79469218';
const SAFE_TX_TYPEHASH = '0xbb8310d486368db6bd6f849402fdd73ad53d316b5a4b2644ad6efe0f941286d8';

export function encodeSafeTransaction(currentSafe: SafeDefinition, txn: SafeTransaction) {
  const txHash = keccak256(
    encodeAbiParameters(
      [
        { type: 'bytes32' },
        { type: 'address' },
        { type: 'uint256' },
        { type: 'bytes32' },
        { type: 'uint256' },
        { type: 'uint256' },
        { type: 'uint256' },
        { type: 'uint256' },
        { type: 'address' },
        { type: 'address' },
        { type: 'uint256' },
      ],
      [
        SAFE_TX_TYPEHASH,
        txn.to,
        BigInt(txn.value),
        keccak256(txn.data),
        BigInt(txn.operation),
        BigInt(txn.safeTxGas),
        BigInt(txn.baseGas),
        BigInt(txn.gasPrice),
        txn.gasToken,
        txn.refundReceiver,
        BigInt(txn._nonce),
      ]
    )
  );

  const domainSeparator = keccak256(
    encodeAbiParameters(
      [{ type: 'bytes32' }, { type: 'uint256' }, { type: 'address' }],
      [SAFE_DOMAIN_SEPARATOR_TYPEHASH, BigInt(currentSafe.chainId), currentSafe.address]
    )
  );

  return encodePacked(['bytes1', 'bytes1', 'bytes32', 'bytes32'], ['0x19', '0x01', domainSeparator, txHash]);
}

export function getSafeTransactionHash(currentSafe: SafeDefinition, txn: SafeTransaction) {
  return keccak256(encodeSafeTransaction(currentSafe, txn));
}

// TODO: this is usually the same but can change on different networks
const SAFE_TXN_ACCESSOR = '0x59AD6735bCd8152B84860Cb256dD9e96b85F69Da';

export function createSimulationData(safeTxn: SafeTransaction) {
  const accessorCall = encodeFunctionData({
    abi: SimulateAccessorABI,
    functionName: 'simulate',
    args: [safeTxn.to, safeTxn.value, safeTxn.data, safeTxn.operation],
  });

  return encodeFunctionData({
    abi: SafeABI,
    functionName: 'simulateAndRevert',
    args: [SAFE_TXN_ACCESSOR, accessorCall],
  });
}
