import React from 'react';
import TxInfoRow from '@/features/Txn/TxInfoRow';
import { ClipboardButton } from '@/components/ClipboardButton';
import { GetTransactionReturnType } from 'viem';
import { ExtendedTransactionReceipt } from '@/types/ExtendedTransactionReceipt';
import { useCannonChains } from '@/providers/CannonProvidersProvider';

type AddressInfoProps = {
  tx: GetTransactionReturnType;
  txReceipt: ExtendedTransactionReceipt;
  getExplorerUrl: ReturnType<typeof useCannonChains>['getExplorerUrl'];
};

const AddressInfo: React.FC<AddressInfoProps> = ({
  tx,
  txReceipt,
  getExplorerUrl,
}) => {
  return (
    <>
      <TxInfoRow
        label="From:"
        description="The sending party of the transaction."
      >
        {tx.chainId !== undefined ? (
          <a
            href={getExplorerUrl(tx.chainId, tx.from)}
            className="inline-flex items-center gap-1 border-b border-dotted border-muted-foreground hover:text-foreground"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>{tx.from}</span>
          </a>
        ) : (
          <span>{tx.from}</span>
        )}
        <ClipboardButton text={tx.from} />
      </TxInfoRow>
      <TxInfoRow
        label="To:"
        description="The receiving party of the transaction (could be a contract
                        address)."
      >
        {tx.chainId !== undefined && tx.to !== null ? (
          <>
            <a
              href={getExplorerUrl(tx.chainId, tx.to)}
              className="inline-flex items-center gap-1 border-b border-dotted border-muted-foreground hover:text-foreground"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>{tx.to ? tx.to : `${txReceipt.contractAddress}`}</span>
            </a>
            <ClipboardButton text={tx.to} />
          </>
        ) : (
          <>
            <span>
              {tx.to ? tx.to : `${txReceipt.contractAddress} Created`}
            </span>
            <ClipboardButton
              text={txReceipt.contractAddress ? txReceipt.contractAddress : ''}
            />
          </>
        )}
      </TxInfoRow>
    </>
  );
};

export default AddressInfo;
