import DetailBadge from '@/features/Tx/detail/DetailBadge';
import InfoTooltip from '@/features/Tx/InfoTooltip';
import HoverHighlight from '@/features/Tx/HoverHighlight';
import { ExtendedTransactionReceipt } from '@/types/ExtendedTransactionReceipt';
import { GetTransactionReturnType } from 'viem';
import Link from 'next/link';
import { useCannonChains } from '@/providers/CannonProvidersProvider';

type OtherEvent = {
  tx: GetTransactionReturnType;
  txReceipt: ExtendedTransactionReceipt;
  hoverId: string;
  setHoverId: (hoverId: string) => void;
  chainId: number | undefined;
};

const OtherEvent: React.FC<OtherEvent> = ({
  tx,
  txReceipt,
  hoverId,
  setHoverId,
  chainId,
}) => {
  const input = tx.input.slice(0, 10);
  const { getExplorerUrl } = useCannonChains();

  const exploreFrom =
    chainId !== undefined ? getExplorerUrl(chainId, tx.from) : '';

  const exploreTo =
    chainId !== undefined && tx.to != null
      ? getExplorerUrl(chainId, tx.to)
      : '';

  return (
    <>
      <div className="flex flex-wrap items-center break-all">
        <span className="text-gray-400 text-sm mr-1">Call</span>
        <DetailBadge value={input} />
        <span className="text-gray-400 text-sm ml-1 mr-1">Method by</span>
        <InfoTooltip
          trigger={
            <Link
              href={exploreFrom}
              className="inline-flex items-center gap-1"
              target={exploreFrom.startsWith('http') ? '_blank' : '_self'}
              rel="noopener noreferrer"
            >
              <HoverHighlight
                id={tx.from}
                hoverId={hoverId}
                setHoverId={setHoverId}
              >
                <span className="text-base break-all">{`${tx.from.substring(
                  0,
                  8
                )}...${tx.from.slice(-6)}`}</span>
              </HoverHighlight>
            </Link>
          }
        >
          {tx.from}
        </InfoTooltip>
        {!txReceipt.contractAddress && tx.to != null && (
          <>
            <span className="text-gray-400 text-sm ml-1 mr-1">on</span>
            <InfoTooltip
              trigger={
                <Link
                  href={exploreTo}
                  className="inline-flex items-center gap-1"
                  target={exploreTo.startsWith('http') ? '_blank' : '_self'}
                  rel="noopener noreferrer"
                >
                  <HoverHighlight
                    id={tx.to}
                    hoverId={hoverId}
                    setHoverId={setHoverId}
                  >
                    <span className="text-base break-all">{`${tx.to.substring(
                      0,
                      8
                    )}...${tx.to.slice(-6)}`}</span>
                  </HoverHighlight>
                </Link>
              }
            >
              {tx.to}
            </InfoTooltip>
          </>
        )}
      </div>
    </>
  );
};

export default OtherEvent;
