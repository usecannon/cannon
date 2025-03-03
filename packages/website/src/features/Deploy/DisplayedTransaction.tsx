import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { formatToken } from '@/helpers/formatters';
import {
  ContractInfo,
  useCannonPackageContracts,
  UseCannonPackageContractsReturnType,
} from '@/hooks/cannon';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import * as viem from 'viem';
import { CustomSpinner } from '@/components/CustomSpinner';
import { Snippet } from '@/components/snippet';
import { AbiParameterPreview } from '@/components/AbiParameterPreview';

// TODO: refactor caching mechanism
// A possible solution is to use useQuery from tanstack/react-query
const useCannonPreloadedContracts = (
  url: string,
  cannonInfo?: UseCannonPackageContractsReturnType,
  isPreloaded?: boolean
) => {
  const useCannonContracts =
    isPreloaded && cannonInfo ? () => cannonInfo : useCannonPackageContracts;
  return useCannonContracts(url);
};

export function DisplayedTransaction(props: {
  txn?: Omit<viem.TransactionRequestBase, 'from'>;
  chainId: number;
  pkgUrl: string;
  cannonInfo?: UseCannonPackageContractsReturnType;
  isPreloaded?: boolean;
  cannonOperation?: string;
}) {
  const { getChainById, getExplorerUrl } = useCannonChains();
  const chain = getChainById(props.chainId);

  if (!chain) throw new Error(`Chain ${props.chainId} not found`);

  const cannonInfo = useCannonPreloadedContracts(
    props.pkgUrl,
    props.cannonInfo,
    props.isPreloaded
  );

  if (cannonInfo.isLoading) {
    return (
      <Card className="bg-black">
        <CardHeader>
          <CardTitle>Loading Transaction Data</CardTitle>
          <CardDescription>
            Fetching cannon package contracts...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-full">
            <CustomSpinner />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (cannonInfo.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Unable to parse this transaction data.
        </AlertDescription>
      </Alert>
    );
  }

  const contracts: ContractInfo | null = cannonInfo.contracts;

  // Get the contract names that match the transaction's `to` address
  const parsedContractNames =
    props.txn && contracts
      ? Object.entries(contracts)
          .filter(([, { address }]) => address === props.txn?.to)
          .map(([contractName]) => contractName)
      : [];

  let contractName = props.txn?.to ?? '';
  let decodedFunctionData: viem.DecodeFunctionDataReturnType | null = null;
  if (contracts) {
    for (const n of parsedContractNames) {
      try {
        decodedFunctionData = viem.decodeFunctionData({
          abi: contracts[n]?.abi,
          data: props.txn?.data || '0x',
        });
        contractName = n;
        break;
      } catch {
        // ignore
      }
    }
  }

  const functionName = decodedFunctionData?.functionName.split('(')[0];
  const functionHash = (
    <span className="font-mono">{props.txn?.data?.slice(0, 10)}</span>
  );
  const rawFunctionArgs = props.txn?.data?.slice(10);
  const functionArgs = decodedFunctionData?.args?.map((v) => v) || [
    rawFunctionArgs,
  ];
  const functionFragmentsFromAbi = contracts?.[contractName]?.abi.filter(
    (f) => 'name' in f && f.name === functionName
  );
  const functionFragmentFromAbi = functionFragmentsFromAbi?.find(
    (f) =>
      f &&
      decodedFunctionData &&
      'inputs' in f &&
      f.inputs?.length === decodedFunctionData.args?.length
  );
  const functionParameters =
    (functionFragmentFromAbi &&
      'inputs' in functionFragmentFromAbi &&
      functionFragmentFromAbi.inputs) ||
    [];

  const address = props.txn?.to ? (
    <a
      className="font-mono border-b border-dotted border-gray-300"
      href={getExplorerUrl(chain.id, props.txn?.to)}
      target="_blank"
      rel="noopener noreferrer"
    >
      {props.txn?.to}
    </a>
  ) : null;

  const value = formatToken(props.txn?.value || BigInt(0), {
    symbol: chain?.nativeCurrency?.symbol,
  });

  if (!contracts && !cannonInfo.isFetching) {
    return (
      <Card className="bg-black">
        <CardHeader>
          <CardTitle>Transaction Data</CardTitle>
          <CardDescription>
            <span className="mr-3">Target: {address}</span>
            <span className="mr-3">Selector: {functionHash}</span>
            <span>Value: {value}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Alert variant="warning">
              <AlertDescription>
                Unable to parse transaction data. Try restaging or manually
                verify this data.
              </AlertDescription>
            </Alert>
          </div>
          <p className="text-xs text-muted-foreground mb-0.5">
            Transaction Data:
          </p>

          <Snippet>
            <code className="break-all whitespace-pre-wrap">
              {props.txn?.data}
            </code>
          </Snippet>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-sm">
      <CardHeader>
        <CardTitle className="font-mono">
          {`${contractName}.${functionName || functionHash} `}
        </CardTitle>
        <CardDescription>
          {props.cannonOperation && (
            <span className="mr-3.5">
              via <span className="font-mono">[{props.cannonOperation}]</span>
            </span>
          )}
          <span className="mr-3.5">Target Address: {address}</span>
          <span className="mr-3.5">Function Selector: {functionHash}</span>
          <span>Value: {value}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row gap-8 h-full">
          <div className="flex-1 w-full lg:w-1/2">
            <div className="flex flex-col gap-4">
              {functionParameters.map((_arg, i) => (
                <AbiParameterPreview
                  chainId={chain.id}
                  key={JSON.stringify(functionParameters[i])}
                  abiParameter={functionParameters[i]}
                  value={functionArgs[i] as string}
                />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
