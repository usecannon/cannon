import React from 'react';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import { ClipboardButton } from '@/components/ClipboardButton';
import { GetTransactionReturnType } from 'viem';

type EventLogProps = {
  tx: GetTransactionReturnType;
  log: any;
  getExplorerUrl: ReturnType<typeof useCannonChains>['getExplorerUrl'];
};

const EventLog: React.FC<EventLogProps> = ({ tx, log, getExplorerUrl }) => {
  return (
    <>
      <div className="space-y-2 mb-3 mt-4">
        <div className="flex items-start gap-x-6 gap-y-1">
          <div className="w-1/12 text-left font-medium text-gray-400">
            <span className="inline-flex w-10 h-10 items-center justify-center text-xs text-gray-900 rounded-full font-bold bg-gray-200 border border-gray-200">
              {log.logIndex}
            </span>
          </div>
          <div className="w-11/12 flex flex-col gap-2">
            <dl className="flex flex-col sm:flex-row items-center mb-2 w-full">
              <dt className="w-full sm:w-1/6 text-left font-medium text-gray-200">
                <h6 className="font-bold">Address:</h6>
              </dt>
              <dd className="w-full sm:w-5/6 items-center gap-2 break-all">
                {tx.chainId !== undefined && tx.chainId !== null ? (
                  <>
                    <a
                      href={getExplorerUrl(tx.chainId, log.address)}
                      className="inline-flex items-center border-b border-dotted border-muted-foreground hover:text-foreground mr-1"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {log.address}
                    </a>
                    <ClipboardButton text={log.address} />
                  </>
                ) : (
                  <>
                    <span>{log.address}</span>
                    <ClipboardButton text={log.address} />
                  </>
                )}
              </dd>
            </dl>
            <dl className="flex flex-col sm:flex-row align-items-baseline mb-2 w-full">
              <dt className="w-full sm:w-1/6 text-left font-medium text-gray-400 text-sm">
                <h6>Topics:</h6>
              </dt>
              <dd className="flex w-full sm:w-5/6 items-center break-all">
                <ul>
                  {log.topics.map((topic: string, index: number) => {
                    return (
                      <li key={index} className="items-center mb-1">
                        <span className="p-1 mr-1 text-xs text-gray-900 border border-gray-400 bg-gray-400 rounded-sm">
                          {index === 1
                            ? `${String(index)}:from`
                            : index === 2
                            ? `${String(index)}:to`
                            : String(index)}
                        </span>
                        {index === 0 ? (
                          <span className="text-sm">{topic}</span>
                        ) : (
                          <>{topic}</>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </dd>
            </dl>
            <dl className="flex flex-col sm:flex-row alighn-items-baseline mb-2 w-full">
              <div className="w-full sm:w-1/6 text-left font-medium text-gray-400 text-sm">
                <h6>Data:</h6>
              </div>
              <div className="w-full sm:w-5/6 flex items-center gap-2 break-all">
                <textarea
                  className="w-full h-24 bg-gray-800 text-gray-400 font-mono border border-gray-800 rounded-md p-2 text-sm"
                  value={log.data}
                  readOnly
                />
              </div>
            </dl>
          </div>
        </div>
      </div>
      <hr className="opacity-75" />
    </>
  );
};

export default EventLog;
