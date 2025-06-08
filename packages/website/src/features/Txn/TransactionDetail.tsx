import { Card, CardContent } from '@/components/ui/card';
import React, { useState } from 'react';
import { GetTransactionReturnType, GetBlockReturnType } from 'viem';
import { ExtendedTransactionReceipt } from '@/types/ExtendedTransactionReceipt';
import ToggleDetail from '@/features/Txn/detail/ToggleDetail';
import GasDetail from '@/features/Txn/detail/GasDetail';
import LayerFeeDetail from '@/features/Txn/detail/LayerFeeDetail';
import OtherDetail from '@/features/Txn/detail/OtherDetail';
import { Chain } from '@/types/Chain';

type TransactionDetailProps = {
  tx: GetTransactionReturnType;
  txReceipt: ExtendedTransactionReceipt;
  txBlock: GetBlockReturnType;
  chain: Chain;
};

const TransactionDetail: React.FC<TransactionDetailProps> = ({
  tx,
  txReceipt,
  txBlock,
  chain,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const symbol = chain?.nativeCurrency.symbol || 'ETH';

  return (
    <div className="w-full overflow-x-auto">
      <Card className="rounded-sm mt-4 w-full mb-3">
        <CardContent className="pt-4">
          <div className="space-y-2">
            {isOpen && (
              <>
                {/* Display Gas Detail */}
                <GasDetail
                  tx={tx}
                  txReceipt={txReceipt}
                  baseFeePerGas={txBlock.baseFeePerGas ?? 0n}
                  symbol={symbol}
                />

                {/* Display Layer 1 and 2 Detail */}
                <LayerFeeDetail tx={tx} txReceipt={txReceipt} symbol={symbol} />
                <hr className="opacity-75" />

                {/* Display Other Detail */}
                <OtherDetail tx={tx} />
                <hr className="opacity-75" />
              </>
            )}
            <ToggleDetail isOpen={isOpen} setIsOpen={setIsOpen} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionDetail;
