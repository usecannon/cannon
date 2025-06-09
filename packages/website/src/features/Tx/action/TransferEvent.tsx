import InfoTooltip from '@/features/Tx/InfoTooltip';
import HoverHighlight from '@/features/Tx/HoverHighlight';

type TransferEventProps = {
  fromAddress: string;
  toAddress: string;
  hoverId: string;
  setHoverId: (hoverId: string) => void;
};

const TransferEvent: React.FC<TransferEventProps> = ({
  fromAddress,
  toAddress,
  hoverId,
  setHoverId,
}) => {
  return (
    <>
      <div className="flex flex-wrap items-center break-all">
        <span className="text-gray-400 text-sm mr-1">
          Transfer Ownership from
        </span>
        <InfoTooltip
          trigger={
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
          }
        >
          {fromAddress}
        </InfoTooltip>
        <span className="text-gray-400 text-sm mr-1">to</span>
        <InfoTooltip
          trigger={
            <HoverHighlight
              id={toAddress}
              hoverId={hoverId}
              setHoverId={setHoverId}
            >
              <span className="text-base break-all">
                {`${toAddress.substring(0, 8)}...${toAddress.slice(-6)}`}
              </span>
            </HoverHighlight>
          }
        >
          {toAddress}
        </InfoTooltip>
      </div>
    </>
  );
};

export default TransferEvent;
