import DetailBadge from '@/features/Tx/detail/DetailBadge';
import InfoTooltip from '@/features/Tx/InfoTooltip';
import HoverHighlight from '@/features/Tx/HoverHighlight';
import { ExtendedTransactionReceipt } from '@/types/ExtendedTransactionReceipt';
import { GetTransactionReturnType } from 'viem';

type OtherEvent = {
  tx: GetTransactionReturnType;
  txReceipt: ExtendedTransactionReceipt;
  hoverId: string;
  setHoverId: (hoverId: string) => void;
};

const OtherEvent: React.FC<OtherEvent> = ({
  tx,
  txReceipt,
  hoverId,
  setHoverId,
}) => {
  const input = tx.input.slice(0, 10);
  return (
    <>
      <div className="flex flex-wrap items-center break-all">
        <span className="text-gray-400 text-sm mr-1">Call</span>
        <DetailBadge value={input} />
        <span className="text-gray-400 text-sm ml-1 mr-1">Method by</span>
        <InfoTooltip
          trigger={
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
          }
        >
          {tx.from}
        </InfoTooltip>
        {!txReceipt.contractAddress && tx.to != null && (
          <>
            <span className="text-gray-400 text-sm ml-1 mr-1">on</span>
            <InfoTooltip
              trigger={
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
