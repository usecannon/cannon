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
import { ClipboardButton } from '@/components/ClipboardButton';
import { CustomSpinner } from '@/components/CustomSpinner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Snippet } from '@/components/snippet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
            <code>{props.txn?.data || ''}</code>
          </Snippet>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-sm">
      <CardHeader>
        <CardTitle className="font-mono">
          {`${contractName}.${functionName || functionHash}`}
        </CardTitle>
        <CardDescription>
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
                <div key={JSON.stringify(functionParameters[i])}>
                  <Label>
                    {functionParameters[i].name && (
                      <span>{functionParameters[i].name}</span>
                    )}
                    {functionParameters[i].type && (
                      <span className="text-xs text-muted-foreground font-mono">
                        {' '}
                        {functionParameters[i].type}
                      </span>
                    )}
                  </Label>
                  {_renderInput(
                    functionParameters[i].type,
                    functionArgs[i] as string
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function _encodeArg(type: string, val: string): string {
  if (Array.isArray(val)) {
    if (!type.endsWith('[]')) {
      throw Error(`Invalid arg type "${type}" and val "${val}"`);
    }

    return `["${val
      .map((v) => _encodeArg(type.slice(0, -2), v))
      .join('", "')}"]`;
  }

  if (type.startsWith('bytes') && val.startsWith('0x')) {
    try {
      const b = viem.hexToBytes(val as viem.Hex);
      const t = b.findIndex((v) => v < 0x20);
      if (b[t] != 0 || b.slice(t).find((v) => v != 0) || t === 0) {
        // this doesn't look like a terminated ascii hex string. leave it as hex
        return val;
      }

      return viem.bytesToString(viem.trim(b, { dir: 'right' }));
    } catch (err) {
      return val.toString();
    }
  } else if (type == 'tuple') {
    // TODO: use a lib?
    return JSON.stringify(val, (_, v) =>
      typeof v === 'bigint' ? v.toString() : v
    );
  } else if (type == 'bool') {
    return val ? 'true' : 'false';
  } else if (type.startsWith('uint') || type.startsWith('int')) {
    return val ? BigInt(val).toString() : '0';
  }

  return val.toString();
}

function _encodeArgTooltip(type: string, val: string): string {
  if (Array.isArray(val)) {
    if (!type.endsWith('[]')) {
      throw Error(`Invalid arg type "${type}" and val "${val}"`);
    }

    const arrayTooltip = `["${val
      .map((v) => _encodeArgTooltip(type.slice(0, -2), v))
      .join('", "')}"]`;
    return arrayTooltip === _encodeArg(type, val) ? '' : arrayTooltip;
  }

  if (type.startsWith('bytes') && val.startsWith('0x')) {
    const bytesTooltip = val.toString();
    return bytesTooltip === _encodeArg(type, val) ? '' : bytesTooltip;
  } else if (type == 'tuple') {
    const tupleTooltip = JSON.stringify(val, (_, v) =>
      typeof v === 'bigint' ? v.toString() : v
    );
    return tupleTooltip === _encodeArg(type, val) ? '' : tupleTooltip;
  } else if (type == 'bool') {
    const boolTooltip = val ? 'true' : 'false';
    return boolTooltip === _encodeArg(type, val) ? '' : boolTooltip;
  } else if (['int256', 'uint256', 'int128', 'uint128'].includes(type)) {
    if (!val) return '';
    const etherValue = `${viem.formatEther(
      BigInt(val)
    )} assuming 18 decimal places`;
    return etherValue === _encodeArg(type, val) ? '' : etherValue;
  }

  return '';
}

function _renderInput(type: string, val: string) {
  if (type === 'tuple') {
    return (
      <Snippet>
        <code>
          {JSON.stringify(JSON.parse(_encodeArg(type, val || '')), null, 2)}
        </code>
      </Snippet>
    );
  }

  const tooltipText = _encodeArgTooltip(type, val);

  return (
    <div className="group relative">
      {tooltipText && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Input
                type="text"
                className="focus:border-muted-foreground/40 focus:ring-0 hover:border-muted-foreground/40"
                readOnly
                value={_encodeArg(type, (val as string) || '')}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{tooltipText}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {!tooltipText && (
        <Input
          type="text"
          className="focus:border-muted-foreground/40 focus:ring-0 hover:border-muted-foreground/40"
          readOnly
          value={_encodeArg(type, (val as string) || '')}
        />
      )}
      <div className="absolute right-0 top-1">
        <ClipboardButton text={val} />
      </div>
    </div>
  );
}
