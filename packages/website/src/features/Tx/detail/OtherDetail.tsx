import React, { useState, useEffect } from 'react';
import TxInfoRow from '@/features/Tx/TxInfoRow';
import { GetTransactionReturnType } from 'viem';
import DetailBadge from '@/features/Tx/detail/DetailBadge';
import { getSelectors } from '@/helpers/api';

type OtherDetailProps = {
  tx: GetTransactionReturnType;
};

const OtherDetail: React.FC<OtherDetailProps> = ({ tx }) => {
  const [input, setInput] = useState<string>('');
  useEffect(() => {
    const fetchData = async () => {
      const selector = tx.input.slice(0, 10);
      const inputArray = tx.input.slice(10).match(/(.{1,64})/g) || [];
      const names = await getSelectors([selector]);
      const txNames = names.results;
      const txName = txNames[selector];

      if (!txName || txName.length === 0) {
        setInput(tx.input);
        return;
      }

      const formatted = [
        `${txName[0].type}: ${txName[0].name}`,
        '',
        `MethodID: ${selector}`,
        ...inputArray.map((chunk, index) => `[${index}]: ${chunk}`),
      ].join('\n');

      setInput(formatted);
    };
    fetchData();
  }, []);

  return (
    <>
      <TxInfoRow
        label="Other Attributes:"
        description="Other data related to this transaction."
      >
        {tx.typeHex !== null && (
          <DetailBadge
            label="Txn Type:"
            value={`${parseInt(tx.typeHex).toLocaleString()} (${tx.type})`}
          />
        )}
        <DetailBadge label="Nonce:" value={String(tx.nonce)} />
        <DetailBadge
          label="Position in Block:"
          value={String(tx.transactionIndex)}
        />
      </TxInfoRow>
      <TxInfoRow
        label="Input Data:"
        description="Additional data included for this transaction. Commonly
                        used as part of contract interaction or as a message
                        sent to the recipient."
      >
        <textarea
          className="w-full h-24 bg-gray-800 text-gray-400 font-mono border border-gray-800 rounded-md p-2 text-sm"
          value={`${input}`}
          readOnly
        />
      </TxInfoRow>
    </>
  );
};
export default OtherDetail;
