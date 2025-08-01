import React from 'react';
import TxInfoRow from '@/features/Tx/TxInfoRow';
import { ClipboardButton } from '@/components/ClipboardButton';
import { ExtendedTransactionReceipt } from '@/types/ExtendedTransactionReceipt';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import HoverHighlight from '@/features/Tx/HoverHighlight';
import Link from 'next/link';

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
          <Link
            href={exploreFrom}
            className="inline-flex items-center gap-1"
            target={exploreFrom.startsWith('http') ? '_blank' : '_self'}
            rel="noopener noreferrer"
          >
            <HoverHighlight
              id={txReceipt.from}
              hoverId={hoverId}
              setHoverId={setHoverId}
            >
              <span>{txReceipt.from}</span>
            </HoverHighlight>
          </Link>
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
            <Link
              href={exploreTo}
              className="inline-flex items-center gap-1"
              target={exploreTo.startsWith('http') ? '_blank' : '_self'}
              rel="noopener noreferrer"
            >
              <HoverHighlight
                id={toAddress ?? ''}
                hoverId={hoverId}
                setHoverId={setHoverId}
              >
                {toAddress}
              </HoverHighlight>
            </Link>
            {txReceipt.contractAddress && <span className="ml-1">Created</span>}
            <ClipboardButton text={toAddress ?? ''} />
          </>
        )}
      </TxInfoRow>
    </>
  );
};

export default AddressInfo;
