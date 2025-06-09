import React from 'react';
import TxInfoRow from '@/features/Tx/TxInfoRow';
import { ClipboardButton } from '@/components/ClipboardButton';
import { ExtendedTransactionReceipt } from '@/types/ExtendedTransactionReceipt';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import HoverHighlight from '@/features/Tx/HoverHighlight';

type AddressInfoProps = {
  chainId: number | undefined;
  txReceipt: ExtendedTransactionReceipt;
  hoverId: string;
  setHoverId: (hoverId: string) => void;
};

const AddressInfo: React.FC<AddressInfoProps> = ({
  chainId,
  txReceipt,
  hoverId,
  setHoverId,
}) => {
  const { getExplorerUrl } = useCannonChains();
  const toAddress = txReceipt.contractAddress ?? txReceipt.to;

  const exploreFrom =
    chainId !== undefined ? getExplorerUrl(chainId, txReceipt.from) : null;

  const exploreTo =
    chainId !== undefined && toAddress != null
      ? getExplorerUrl(chainId, toAddress)
      : null;

  return (
    <>
      <TxInfoRow
        label="From:"
        description="The sending party of the transaction."
      >
        {exploreFrom ? (
          <a
            href={exploreFrom}
            className="inline-flex items-center gap-1"
            target="_blank"
            rel="noopener noreferrer"
          >
            <HoverHighlight
              id={txReceipt.from}
              hoverId={hoverId}
              setHoverId={setHoverId}
            >
              <span>{txReceipt.from}</span>
            </HoverHighlight>
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
              className="inline-flex items-center gap-1"
              target="_blank"
              rel="noopener noreferrer"
            >
              <HoverHighlight
                id={toAddress ?? ''}
                hoverId={hoverId}
                setHoverId={setHoverId}
              >
                {toAddress}
              </HoverHighlight>
            </a>
            {txReceipt.contractAddress && <span className="ml-1">Created</span>}
            <ClipboardButton text={toAddress ?? ''} />
          </>
        )}
      </TxInfoRow>
    </>
  );
};

export default AddressInfo;
