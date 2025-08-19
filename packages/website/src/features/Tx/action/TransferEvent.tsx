import InfoTooltip from '@/features/Tx/InfoTooltip';
import HoverHighlight from '@/features/Tx/HoverHighlight';
import Link from 'next/link';
import { useCannonChains } from '@/providers/CannonProvidersProvider';

type TransferEventProps = {
  fromAddress: string;
  toAddress: string;
  hoverId: string;
  setHoverId: (hoverId: string) => void;
  chainId: number | undefined;
};

const TransferEvent: React.FC<TransferEventProps> = ({
  fromAddress,
  toAddress,
  hoverId,
  setHoverId,
  chainId,
}) => {
  const { getExplorerUrl } = useCannonChains();

  const exploreFrom =
    chainId !== undefined ? getExplorerUrl(chainId, fromAddress) : '';

  const exploreTo =
    chainId !== undefined && toAddress != null
      ? getExplorerUrl(chainId, toAddress)
      : '';

  return (
    <>
      <div className="flex flex-wrap items-center break-all">
        <span className="text-gray-400 text-sm mr-1">
          Transfer Ownership from
        </span>
        <InfoTooltip
          trigger={
            <Link
              href={exploreFrom}
              className="inline-flex items-center gap-1"
              target={exploreFrom.startsWith('http') ? '_blank' : '_self'}
              rel="noopener noreferrer"
            >
              <HoverHighlight
                id={fromAddress}
                hoverId={hoverId}
                setHoverId={setHoverId}
              >
                <span className="text-base mr-1 break-all">{`${fromAddress.substring(
                  0,
                  8
                )}...${fromAddress.slice(-6)}`}</span>
              </HoverHighlight>
            </Link>
          }
        >
          {fromAddress}
        </InfoTooltip>
        <span className="text-gray-400 text-sm mr-1">to</span>
        <InfoTooltip
          trigger={
            <Link
              href={exploreTo}
              className="inline-flex items-center gap-1"
              target={exploreTo.startsWith('http') ? '_blank' : '_self'}
              rel="noopener noreferrer"
            >
              <HoverHighlight
                id={toAddress}
                hoverId={hoverId}
                setHoverId={setHoverId}
              >
                <span className="text-base break-all">
                  {`${toAddress.substring(0, 8)}...${toAddress.slice(-6)}`}
                </span>
              </HoverHighlight>
            </Link>
          }
        >
          {toAddress}
        </InfoTooltip>
      </div>
    </>
  );
};

export default TransferEvent;
