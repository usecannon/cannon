import { SafeDefinition } from '@/helpers/store';
import { SafeTransaction } from '@/types/SafeTransaction';
import { encodeAbiParameters, encodePacked, keccak256 } from 'viem';

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
      ],
    ),
  );

  const domainSeparator = keccak256(
    encodeAbiParameters(
      [{ type: 'bytes32' }, { type: 'uint256' }, { type: 'address' }],
      [SAFE_DOMAIN_SEPARATOR_TYPEHASH, BigInt(currentSafe.chainId), currentSafe.address],
    ),
  );

  return encodePacked(['bytes1', 'bytes1', 'bytes32', 'bytes32'], ['0x19', '0x01', domainSeparator, txHash]);
}

export function getSafeTransactionHash(currentSafe: SafeDefinition, txn: SafeTransaction) {
  return keccak256(encodeSafeTransaction(currentSafe, txn));
}
