import { useState, useEffect } from 'react';
import { Hash, createPublicClient, http, formatEther, formatUnits } from 'viem';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ClipboardButton } from '@/components/ClipboardButton';
import { Minus, Plus, CircleCheck, CircleX, Clock5 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useRouter } from 'next/router';

function getTxnTypeLabel(typeHex: string): string {
  switch (typeHex) {
    case '0x0':
      return 'Legacy';
    case '0x1':
      return 'EIP-2930';
    case '0x2':
      return 'EIP-1559';
    default:
      return 'Unknown';
  }
}

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'eventlog', label: 'Logs' },
] as const;

type TabId = (typeof tabs)[number]['id'];

export default function TransactionDetail() {
  const router = useRouter();
  const { chainId, txHash } = router.query;
  const [txn, setTxn] = useState<any>(null);
  const [txnReceipt, setTxnReceipt] = useState<any>(null);
  const [isOpenMoreDetails, setIsOpenMoreDetails] = useState(false);
  const [txnBlock, setTxnBlock] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const { getChainById, getExplorerUrl } = useCannonChains();
  // const chain = getChainById(1);
  const chain = getChainById(Number(chainId));

  const publicClient = createPublicClient({
    chain,
    transport: http(chain?.rpcUrls.default.http[0]),
  });

  useEffect(() => {
    const fetchStatus = async (transactionHash: Hash | undefined) => {
      if (transactionHash) {
        const receipt = await publicClient.getTransactionReceipt({
          hash: transactionHash,
        });
        const tx = await publicClient.getTransaction({ hash: transactionHash });
        const block = await publicClient.getBlock({
          blockNumber: receipt.blockNumber,
        });

        setTxnReceipt(receipt);
        setTxn(tx);
        setTxnBlock(block);
        console.log(receipt);
        // console.log(tx);
        // console.log(block);
      }
    };

    if (typeof txHash === 'string' && txHash.startsWith('0x')) {
      void fetchStatus(txHash as Hash);
    }
  }, [chainId, txHash]);

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');

    if (hash === 'eventlog') {
      setActiveTab(hash as TabId);
    } else {
      setActiveTab('overview');
    }
  }, [router.asPath]);

  const handleTabClick = (tabId: TabId) => {
    if (tabId === 'overview') {
      history.pushState(null, '', router.asPath.split('#')[0]);
    } else {
      window.location.hash = tabId;
    }
    setActiveTab(tabId);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <>
            <Card className="rounded-sm w-full">
              <CardHeader>
                <CardTitle>TRANSACTION ACTION</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <span className="text-gray-400 text-sm mr-2">Contracts:</span>
                  <span className="mr-2">{chain?.name}</span>
                  <span className="text-gray-400 text-sm mr-2">{`(ID: ${chain?.id})`}</span>
                </div>
                <div className="flex items-center break-all">
                  <span className="text-gray-400 text-sm mr-1">Transfer</span>
                  <span className="text-base mr-1">
                    {`${String(formatEther(txn.value))} ${
                      chain?.nativeCurrency.symbol
                    }`}
                  </span>
                  <span className="text-gray-400 text-sm mr-1">to</span>
                  <span className="text-base">{txn.to}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-sm mt-4 w-full">
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row items-start gap-x-4 gap-y-1">
                    <div className="w-full sm:w-1/4 text-left font-medium text-gray-400">
                      Transaction Hash:
                    </div>
                    <div className="w-full sm:w-3/4 flex items-center gap-2 break-all">
                      <span>{txn.hash}</span>
                      <ClipboardButton text={txn.hash} />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start gap-x-4 gap-y-1">
                    <div className="w-full sm:w-1/4 text-left font-medium text-gray-400">
                      Status:
                    </div>
                    <div className="w-full sm:w-3/4 flex items-center gap-2">
                      {txnReceipt.status === 'success' ? (
                        <span className="px-2 py-1 text-xs font-semibold text-green-600 border border-green-600 rounded-md flex items-center gap-1">
                          <CircleCheck className="w-3 h-3" />
                          <span>{txnReceipt.status}</span>
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-semibold text-red-600 border border-red-600 rounded-md flex items-center gap-1">
                          <CircleX className="w-3 h-3" />
                          <span>{txnReceipt.status}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start gap-x-4 gap-y-1">
                    <div className="w-full sm:w-1/4 text-left font-medium text-gray-400">
                      Block:
                    </div>
                    <div className="w-full sm:w-3/4 flex items-center gap-2">
                      <span>{String(txn.blockNumber)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start gap-x-4 gap-y-1">
                    <div className="w-full sm:w-1/4 text-left font-medium text-gray-400">
                      Timestamp:
                    </div>
                    <div className="w-full sm:w-3/4 flex items-center gap-2">
                      <Clock5 className="w-4 h-4 text-gray-400" />
                      <span>{`${Math.floor(
                        (Math.floor(Date.now() / 1000) -
                          Number(txnBlock.timestamp)) /
                          (60 * 60 * 24)
                      )} days ago`}</span>
                    </div>
                  </div>
                  <hr className="opacity-75" />
                  <div className="flex flex-col sm:flex-row items-start gap-x-4 gap-y-1">
                    <div className="w-full sm:w-1/4 text-left font-medium text-gray-400">
                      From:
                    </div>
                    <div className="w-full sm:w-3/4 flex items-center gap-2 break-all">
                      <a
                        href={getExplorerUrl(txn.chainId, txn.from)}
                        className="inline-flex items-center gap-1 border-b border-dotted border-muted-foreground hover:text-foreground"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span>{txn.from}</span>
                      </a>
                      <ClipboardButton text={txn.from} />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start gap-x-4 gap-y-1">
                    <div className="w-full sm:w-1/4 text-left font-medium text-gray-400">
                      To:
                    </div>
                    <div className="w-full sm:w-3/4 flex items-center gap-2 break-all">
                      <a
                        href={getExplorerUrl(
                          txn.chainId,
                          txn.to ? txn.to : txnReceipt.contractAddress
                        )}
                        className="inline-flex items-center gap-1 border-b border-dotted border-muted-foreground hover:text-foreground"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span>
                          {txn.to
                            ? txn.to
                            : `${txnReceipt.contractAddress} Created`}
                        </span>
                      </a>
                      <ClipboardButton
                        text={txn.to ? txn.to : txnReceipt.contractAddress}
                      />
                    </div>
                  </div>
                  <hr className="opacity-75" />
                  <div className="flex flex-col sm:flex-row items-start gap-x-4 gap-y-1">
                    <div className="w-full sm:w-1/4 text-left font-medium text-gray-400">
                      Value:
                    </div>
                    <div className="w-full sm:w-3/4 flex items-center gap-2">
                      <span>{`${String(formatEther(txn.value))} ${
                        chain?.nativeCurrency.symbol
                      }`}</span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start gap-x-4 gap-y-1">
                    <div className="w-full sm:w-1/4 text-left font-medium text-gray-400">
                      Transaction Fee:
                    </div>
                    <div className="w-full sm:w-3/4 flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger className="cursor-default">
                          <span className="">
                            {`${String(
                              formatEther(
                                BigInt(txn.gasPrice) *
                                  BigInt(txnReceipt.gasUsed)
                              )
                            )} ${chain?.nativeCurrency.symbol}`}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm text-center">
                          Gas Price * Gas Used by Transaction
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start gap-x-4 gap-y-1">
                    <div className="w-full sm:w-1/4 text-left font-medium text-gray-400">
                      Gas Price:
                    </div>
                    <div className="w-full sm:w-3/4 flex items-center gap-2">
                      <span>{String(formatUnits(txn.gasPrice, 9))} Gwei</span>
                      <span className="text-gray-400">
                        (
                        {`${String(formatEther(txn.gasPrice))} ${
                          chain?.nativeCurrency.symbol
                        }`}
                        )
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-sm mt-4 w-full mb-3">
              <CardContent className="pt-4">
                <div className="space-y-2">
                  {isOpenMoreDetails && (
                    <>
                      <div className="flex flex-col sm:flex-row items-start gap-x-4 gap-y-1">
                        <div className="w-full sm:w-1/4 text-left font-medium text-gray-400">
                          Gas Limit & Usage by Txn:
                        </div>
                        <div className="w-full sm:w-3/4 flex items-center gap-2">
                          <span className="mr-1">{`${txn.gas.toLocaleString()}`}</span>
                          <span className="text-gray-400 mr-1">|</span>
                          <span className="mr-1">{`${txnReceipt.gasUsed.toLocaleString()}`}</span>
                          <span>{`(${(
                            (Number(txnReceipt.gasUsed) / Number(txn.gas)) *
                            100
                          ).toFixed(2)}%)`}</span>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-start gap-x-4 gap-y-1">
                        <div className="w-full sm:w-1/4 text-left font-medium text-gray-400">
                          Gas Fees:
                        </div>
                        <div className="w-full sm:w-3/4 flex items-center gap-2 break-all">
                          <Tooltip>
                            <TooltipTrigger className="cursor-default">
                              <span className="text-gray-400 mr-1">Base:</span>
                              <span className="mr-1">
                                {String(formatUnits(txnBlock.baseFeePerGas, 9))}{' '}
                                Gwei
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm text-center">
                              {` ${String(
                                formatEther(txnBlock.baseFeePerGas)
                              )} ${chain?.nativeCurrency.symbol}`}
                            </TooltipContent>
                          </Tooltip>
                          {txn.maxFeePerGas && (
                            <>
                              <span className="text-gray-400 mr-1">|</span>
                              <Tooltip>
                                <TooltipTrigger className="cursor-default">
                                  <span className="text-gray-400 mr-1">
                                    Max:
                                  </span>
                                  <span className="mr-1">
                                    {String(formatUnits(txn.maxFeePerGas, 9))}{' '}
                                    Gwei
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-sm text-center">
                                  {`${String(formatEther(txn.maxFeePerGas))} ${
                                    chain?.nativeCurrency.symbol
                                  }`}
                                </TooltipContent>
                              </Tooltip>
                            </>
                          )}
                          {txn.maxPriorityFeePerGas && (
                            <>
                              <span className="text-gray-400 mr-1">|</span>
                              <Tooltip>
                                <TooltipTrigger className="cursor-default">
                                  <span className="text-gray-400 mr-1">
                                    Max Priority:
                                  </span>
                                  <span>
                                    {String(
                                      formatUnits(txn.maxPriorityFeePerGas, 9)
                                    )}{' '}
                                    Gwei
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-sm text-center">
                                  {`${String(
                                    formatEther(txn.maxPriorityFeePerGas)
                                  )} ${chain?.nativeCurrency.symbol}`}
                                </TooltipContent>
                              </Tooltip>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-start gap-x-4 gap-y-1">
                        <div className="w-full sm:w-1/4 text-left font-medium text-gray-400">
                          Burnt & Txn Savings Fees:
                        </div>
                        <div className="w-full sm:w-3/4 flex items-center gap-2 break-all">
                          <span className="inline-block px-2 py-1 text-xs font-semibold border border-gray-800 bg-gray-800 rounded-md">
                            <span className="text-gray-400 mr-1">Burnt:</span>
                            <span>
                              {`${String(
                                formatEther(
                                  BigInt(txnBlock.baseFeePerGas) *
                                    txnReceipt.gasUsed
                                )
                              )} ${chain?.nativeCurrency.symbol}`}
                            </span>
                          </span>
                          {txn.maxFeePerGas && (
                            <span className="inline-block px-2 py-1 text-xs font-semibold border border-gray-800 bg-gray-800 rounded-md">
                              <span className="text-gray-400 mr-1">
                                Txn Savings:
                              </span>
                              <span>
                                {`${String(
                                  formatEther(
                                    BigInt(txn.maxFeePerGas) *
                                      BigInt(txnReceipt.gasUsed) -
                                      BigInt(txnReceipt.effectiveGasPrice) *
                                        BigInt(txnReceipt.gasUsed)
                                  )
                                )} ${chain?.nativeCurrency.symbol}`}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                      {txnReceipt.l1Fee &&
                        txnReceipt.l1GasPrice &&
                        txnReceipt.l1GasUsed && (
                          <>
                            <hr className="opacity-75" />
                            <div className="flex flex-col sm:flex-row items-start gap-x-4 gap-y-1">
                              <div className="w-full sm:w-1/4 text-left font-medium text-gray-400">
                                L2 Fees Paid:
                              </div>
                              <div className="w-full sm:w-3/4 flex items-center gap-2">
                                <span>{`${String(
                                  formatEther(
                                    BigInt(txn.gasPrice) *
                                      BigInt(txnReceipt.gasUsed)
                                  )
                                )} ${chain?.nativeCurrency.symbol}`}</span>
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row items-start gap-x-4 gap-y-1">
                              <div className="w-full sm:w-1/4 text-left font-medium text-gray-400">
                                L1 Fees Paid:
                              </div>
                              <div className="w-full sm:w-3/4 flex items-center gap-2">
                                <span>{`${String(
                                  formatEther(txnReceipt.l1Fee)
                                )} ${chain?.nativeCurrency.symbol}`}</span>
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row items-start gap-x-4 gap-y-1">
                              <div className="w-full sm:w-1/4 text-left font-medium text-gray-400">
                                L1 Gas Price:
                              </div>
                              <div className="w-full sm:w-3/4 flex items-center gap-2">
                                <span>{`${String(
                                  formatEther(txnReceipt.l1GasPrice)
                                )} ${chain?.nativeCurrency.symbol} (${String(
                                  formatUnits(txnReceipt.l1GasPrice, 9)
                                )} Gwei)`}</span>
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row items-start gap-x-4 gap-y-1">
                              <div className="w-full sm:w-1/4 text-left font-medium text-gray-400">
                                L1 Gas Used by Txn:
                              </div>
                              <div className="w-full sm:w-3/4 flex items-center gap-2">
                                <span>{`${String(
                                  txnReceipt.l1GasUsed.toLocaleString()
                                )}`}</span>
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row items-start gap-x-4 gap-y-1">
                              <div className="w-full sm:w-1/4 text-left font-medium text-gray-400">
                                L1 Fee Scalar:
                              </div>
                              <div className="w-full sm:w-3/4 flex items-center gap-2">
                                <span>{`${String(
                                  txnReceipt.l1FeeScalar || 0
                                )}`}</span>
                              </div>
                            </div>
                          </>
                        )}
                      <hr className="opacity-75" />
                      <div className="flex flex-col sm:flex-row items-start gap-x-4 gap-y-1">
                        <div className="w-full sm:w-1/4 text-left font-medium text-gray-400">
                          Other Attributes:
                        </div>
                        <div className="w-full sm:w-3/4 flex items-center gap-2 break-all">
                          <span className="inline-block px-2 py-1 text-xs font-semibold border border-gray-800 bg-gray-800 rounded-md">
                            <span className="text-gray-400 mr-1">
                              Txn Type:
                            </span>
                            <span>
                              {`${String(parseInt(txn.typeHex))}`} (
                              {getTxnTypeLabel(txn.typeHex)})
                            </span>
                          </span>
                          <span className="inline-block px-2 py-1 text-xs font-semibold border border-gray-800 bg-gray-800 rounded-md">
                            <span className="text-gray-400 mr-1">Nonce:</span>
                            <span>{String(txn.nonce)}</span>
                          </span>
                          <span className="inline-block px-2 py-1 text-xs font-semibold border border-gray-800 bg-gray-800 rounded-md">
                            <span className="text-gray-400 mr-1">
                              Position in Block:
                            </span>
                            <span>{String(txn.transactionIndex)}</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-start gap-x-4 gap-y-1">
                        <div className="w-full sm:w-1/4 text-left font-medium text-gray-400">
                          Input Data:
                        </div>
                        <div className="w-full sm:w-3/4 flex items-center gap-2">
                          <textarea
                            className="w-full h-24 bg-gray-800 text-gray-400 font-mono border border-gray-800 rounded-md p-2 text-xs"
                            value={`${txn.input}`}
                            readOnly
                          />
                        </div>
                      </div>
                      <hr className="opacity-75" />
                    </>
                  )}
                  <div className="flex flex-col sm:flex-row items-start gap-x-4 gap-y-1">
                    <div className="w-full sm:w-1/4 text-left font-medium text-gray-400">
                      More Details:
                    </div>
                    <div className="w-full sm:w-3/4 flex items-center gap-2 font-bold">
                      {isOpenMoreDetails ? (
                        <span
                          className="text-gray-300 cursor-pointer flex items-center gap-1"
                          onClick={() => setIsOpenMoreDetails(false)}
                        >
                          <Minus className="w-4 h-4" />
                          <span>Clicks to show less</span>
                        </span>
                      ) : (
                        <span
                          className="text-gray-300 cursor-pointer flex items-center gap-1"
                          onClick={() => setIsOpenMoreDetails(true)}
                        >
                          <Plus className="w-4 h-4" />
                          <span>Clicks to show more</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        );
      case 'eventlog':
        return (
          <>
            <Card className="rounded-sm mt-4 w-full">
              <CardContent className="mt-4">
                <h2>Transaction Receipt Event Logs</h2>
                {txnReceipt.logs.map((log: any) => (
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
                              <a
                                href={getExplorerUrl(txn.chainId, log.address)}
                                className="inline-flex items-center border-b border-dotted border-muted-foreground hover:text-foreground mr-1"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {log.address}
                              </a>
                              <ClipboardButton text={log.address} />
                            </dd>
                          </dl>
                          <dl className="flex flex-col sm:flex-row align-items-baseline mb-2 w-full">
                            <dt className="w-full sm:w-1/6 text-left font-medium text-gray-400 text-sm">
                              <h6>Topics:</h6>
                            </dt>
                            <dd className="flex w-full sm:w-5/6 items-center break-all">
                              <ul>
                                {log.topics.map(
                                  (topic: string, index: number) => {
                                    return (
                                      <li
                                        key={index}
                                        className="items-center mb-1"
                                      >
                                        <span className="p-1 mr-1 text-xs text-gray-900 border border-gray-400 bg-gray-400 rounded-sm">
                                          {index === 1
                                            ? `${String(index)}:from`
                                            : index === 2
                                            ? `${String(index)}:to`
                                            : String(index)}
                                        </span>
                                        {index === 0 ? (
                                          <span className="text-sm">
                                            {topic}
                                          </span>
                                        ) : (
                                          <>
                                            <a
                                              href={getExplorerUrl(
                                                txn.chainId,
                                                topic
                                              )}
                                              className="inline-flex items-center border-b border-dotted border-muted-foreground hover:text-foreground text-sm"
                                              target="_blank"
                                              rel="noopener noreferrer"
                                            >
                                              {topic}
                                            </a>
                                          </>
                                        )}
                                      </li>
                                    );
                                  }
                                )}
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
                ))}
              </CardContent>
            </Card>
          </>
        );
      default:
        return <div>Invalid tab</div>;
    }
  };

  return (
    <>
      {txn && txnReceipt && txnBlock && (
        <div className="w-full max-w-screen-lg mx-auto px-4">
          <div className="ml-3">
            <h1 className="text-2xl font-bold mt-4">Transaction Details</h1>
          </div>
          <hr className="mt-3" />
          <div className="mt-3 ml-3">
            <ul className="flex space-x-2 mt-3">
              {tabs
                .filter((tab) => {
                  if (tab.id === 'eventlog') {
                    return txnReceipt.logs.length > 0;
                  }
                  return true;
                })
                .map((tab) => (
                  <li
                    key={tab.id}
                    className={`pb-2 cursor-pointer ${
                      activeTab === tab.id
                        ? 'px-2 py-1 font-bold text-xs text-white border border-gray-600 bg-gray-600 rounded-lg'
                        : 'px-2 py-1 text-xs font-semibold text-gray-200 border border-gray-800 bg-gray-800 rounded-lg flex items-center'
                    }`}
                    onClick={() => handleTabClick(tab.id)}
                  >
                    {tab.id === 'eventlog'
                      ? `${tab.label} (${txnReceipt.logs.length})`
                      : tab.label}
                  </li>
                ))}
            </ul>
          </div>

          <div className="w-full px-4 mt-3">{renderContent()}</div>
        </div>
      )}
    </>
  );
}
