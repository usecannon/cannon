import React from 'react';
import TxInfoRow from '@/features/Txn/TxInfoRow';
import { ClipboardButton } from '@/components/ClipboardButton';
import { ExtendedTransactionReceipt } from '@/types/ExtendedTransactionReceipt';
import { useCannonChains } from '@/providers/CannonProvidersProvider';

type AddressInfoProps = {
  chainId: number | undefined;
  txReceipt: ExtendedTransactionReceipt;
};

const AddressInfo: React.FC<AddressInfoProps> = ({ chainId, txReceipt }) => {
  const { getExplorerUrl } = useCannonChains();
  const to =
    txReceipt.contractAddress != null
      ? txReceipt.contractAddress
      : txReceipt.to;

  const exploreFrom =
    chainId !== undefined ? getExplorerUrl(chainId, txReceipt.from) : null;

  const exploreTo =
    chainId !== undefined && to != null ? getExplorerUrl(chainId, to) : null;

  return (
    <>
      <TxInfoRow
        label="From:"
        description="The sending party of the transaction."
      >
        {exploreFrom ? (
          <a
            href={exploreFrom}
            className="inline-flex items-center gap-1 border-b border-dotted border-muted-foreground hover:text-foreground"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>{txReceipt.from}</span>
          </a>
        ) : (
          <span>{txReceipt.from}</span>
        )}
        <ClipboardButton text={txReceipt.from} />
      </TxInfoRow>
      <TxInfoRow
        label="To:"
        description="The receiving party of the transaction (could be a contract
                        address)."
      >
        {exploreTo && (
          <>
            <a
              href={exploreTo}
              className="inline-flex items-center gap-1 border-b border-dotted border-muted-foreground hover:text-foreground"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>{to}</span>
            </a>
            {txReceipt.contractAddress && <span className="ml-1">Created</span>}
            <ClipboardButton text={to ? to : ''} />
          </>
        )}
      </TxInfoRow>
    </>
  );
};

export default AddressInfo;
