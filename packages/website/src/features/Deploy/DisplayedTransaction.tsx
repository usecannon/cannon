import { Alert } from '@/components/Alert';
import { chainsById, getExplorerUrl } from '@/helpers/chains';
import { formatToken } from '@/helpers/formatters';
import {
  ContractInfo,
  useCannonPackageContracts,
  UseCannonPackageContractsReturnType,
} from '@/hooks/cannon';
import {
  AlertDescription,
  Box,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Link,
  Spinner,
  Text,
} from '@chakra-ui/react';
import { FC, ReactNode } from 'react';
import { a11yDark, CopyBlock } from 'react-code-blocks';
import {
  bytesToString,
  decodeFunctionData,
  DecodeFunctionDataReturnType,
  Hex,
  hexToBytes,
  TransactionRequestBase,
  trim,
} from 'viem';

const TxWrapper: FC<{ children: ReactNode }> = ({ children }) => (
  <Box p={6} border="1px solid" borderColor="gray.600" bgColor="black">
    {children}
  </Box>
);
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
  txn?: Omit<TransactionRequestBase, 'from'>;
  chainId: number;
  pkgUrl: string;
  cannonInfo?: UseCannonPackageContractsReturnType;
  isPreloaded?: boolean;
}) {
  const chain = chainsById[props.chainId];

  const cannonInfo = useCannonPreloadedContracts(
    props.pkgUrl,
    props.cannonInfo,
    props.isPreloaded
  );

  if (cannonInfo.isLoading) {
    return (
      <TxWrapper>
        <Flex alignItems="center" justifyContent="center" height="100%">
          <Spinner />
        </Flex>
      </TxWrapper>
    );
  }

  if (cannonInfo.isError) {
    return (
      <TxWrapper>
        <Alert status="error">
          <AlertDescription fontSize="sm" lineHeight="0">
            Unable to fetch cannon package contracts.
          </AlertDescription>
        </Alert>
      </TxWrapper>
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
  let decodedFunctionData: DecodeFunctionDataReturnType | null = null;
  if (contracts) {
    for (const n of parsedContractNames) {
      try {
        decodedFunctionData = decodeFunctionData({
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
  const functionHash = props.txn?.data?.slice(0, 10);
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

  const address = (
    <Link isExternal href={getExplorerUrl(chain.id, props.txn?.to || '')}>
      {props.txn?.to}
    </Link>
  );
  const value = formatToken(props.txn?.value || BigInt(0), {
    symbol: chain?.nativeCurrency?.symbol,
  });

  if (!contracts && !cannonInfo.isFetching) {
    return (
      <TxWrapper>
        <Box mb={5}>
          <Alert status="warning">
            <AlertDescription fontSize="sm" lineHeight="0">
              Unable to parse transaction data. Try restaging or manually verify
              this data.
            </AlertDescription>
          </Alert>
        </Box>
        <Box mb={2}>
          <Text fontSize="xs" color="gray.300">
            <Text as="span" mr={3}>
              Target: {address}
            </Text>
            <Text as="span" mr={3}>
              Selector: {functionHash}
            </Text>
            <Text as="span">Value: {value}</Text>
          </Text>
        </Box>
        <Text fontSize="xs" color="gray.300" mb={0.5}>
          Transaction Data:
        </Text>
        <CopyBlock
          text={props.txn?.data || ''}
          language="bash"
          showLineNumbers={false}
          codeBlock
          theme={a11yDark}
          customStyle={{ fontSize: '14px' }}
        />
      </TxWrapper>
    );
  }

  return (
    <Box p={6} border="1px solid" borderColor="gray.600" bgColor="black">
      <Box maxW="100%" overflowX="auto">
        <Box whiteSpace="nowrap" mb={functionParameters.length > 0 ? 4 : 0}>
          <Heading size="sm" fontFamily="mono" fontWeight="semibold" mb={1}>
            {`${contractName}.${functionName || functionHash}`}
          </Heading>
          <Text fontSize="xs" color="gray.300">
            <Text as="span" mr={3}>
              Target: {address}
            </Text>
            <Text as="span" mr={3}>
              Selector: {functionHash}
            </Text>
            <Text as="span">Value: {value}</Text>
          </Text>
        </Box>
        <Flex flexDirection={['column', 'column', 'row']} gap={8} height="100%">
          <Box flex="1" w={['100%', '100%', '50%']}>
            {functionParameters.map((_arg, i) => [
              <Box key={JSON.stringify(functionParameters[i])}>
                <FormControl mb="4">
                  <FormLabel fontSize="sm" mb={1}>
                    {functionParameters[i].name && (
                      <Text display="inline">{functionParameters[i].name}</Text>
                    )}
                    {functionParameters[i].type && (
                      <Text
                        fontSize="xs"
                        color="whiteAlpha.700"
                        display="inline"
                      >
                        {' '}
                        {functionParameters[i].type}
                      </Text>
                    )}
                  </FormLabel>
                  {_renderInput(
                    functionParameters[i].type,
                    functionArgs[i] as string
                  )}
                </FormControl>
              </Box>,
            ])}
          </Box>
        </Flex>
      </Box>
    </Box>
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
      const b = hexToBytes(val as Hex);
      const t = b.findIndex((v) => v < 0x20);
      if (b[t] != 0 || b.slice(t).find((v) => v != 0)) {
        // this doesn't look like a terminated ascii hex string. leave it as hex
        return val;
      }

      if (t === 0) {
        return '';
      }

      return bytesToString(trim(b, { dir: 'right' }));
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

function _renderInput(type: string, val: string) {
  if (type === 'tuple') {
    return (
      <CopyBlock
        text={JSON.stringify(JSON.parse(_encodeArg(type, val || '')), null, 2)}
        language="json"
        showLineNumbers={false}
        codeBlock
        theme={a11yDark}
        customStyle={{ fontSize: '14px' }}
      />
    );
  }

  return (
    <Input
      type="text"
      size="sm"
      bg="black"
      borderColor="whiteAlpha.400"
      isReadOnly
      _focus={{
        boxShadow: 'none !important',
        outline: 'none !important',
        borderColor: 'whiteAlpha.400 !important',
      }}
      _focusVisible={{
        boxShadow: 'none !important',
        outline: 'none !important',
        borderColor: 'whiteAlpha.400 !important',
      }}
      _hover={{
        boxShadow: 'none !important',
        outline: 'none !important',
        borderColor: 'whiteAlpha.400 !important',
      }}
      value={_encodeArg(type, (val as string) || '')}
    />
  );
}
