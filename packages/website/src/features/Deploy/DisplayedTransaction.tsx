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
import { useMemo } from 'react';
import { a11yDark, CopyBlock } from 'react-code-blocks';
import {
  Address,
  bytesToString,
  decodeFunctionData,
  Hex,
  hexToBytes,
  TransactionRequestBase,
  trim,
  formatEther,
} from 'viem';
import { chainsById } from '@/helpers/chains';
import { Alert } from '@/components/Alert';
import { useCannonPackageContracts } from '@/hooks/cannon';

export function DisplayedTransaction(props: {
  txn?: Omit<TransactionRequestBase, 'from'>;
  chainId: number;
  pkgUrl: string;
}) {
  const chain = useMemo(() => chainsById[props.chainId], [props.chainId]);

  const cannonInfo = useCannonPackageContracts(
    props.pkgUrl ? '@' + props.pkgUrl.replace('://', ':') : ''
  );

  if (cannonInfo.isFetching) {
    return (
      <Box p={6} border="1px solid" borderColor="gray.600" bgColor="black">
        <Flex alignItems="center" justifyContent="center" height="100%">
          <Spinner />
        </Flex>
      </Box>
    );
  }

  if (cannonInfo.isError) {
    return (
      <Box p={6} border="1px solid" borderColor="gray.600" bgColor="black">
        <Alert status="error">
          <AlertDescription fontSize="sm" lineHeight="0">
            Unable to fetch cannon package contracts.
          </AlertDescription>
        </Alert>
      </Box>
    );
  }

  const contracts = cannonInfo.contracts as {
    [key: string]: { address: Address; abi: any[] };
  };
  const parsedContractNames =
    props.txn && contracts
      ? Object.entries(contracts)
          .filter((c) => c[1].address === props.txn?.to)
          .map((v) => v[0])
      : '';

  let parsedContract = props.txn ? props.txn.to : '';
  let parsedFunction = null;
  if (contracts) {
    for (const n of parsedContractNames) {
      try {
        parsedFunction = decodeFunctionData({
          abi: contracts[n].abi,
          data: props.txn?.data as any,
        });
        parsedContract = n;
        break;
      } catch {
        // ignore
      }
    }
  }
  const execFunc = props.txn
    ? parsedFunction
      ? parsedFunction.functionName.split('(')[0]
      : props.txn.data?.slice(0, 10)
    : '';

  const execContractInfo =
    contracts && parsedContract ? contracts[parsedContract] : null;
  const execFuncFragment =
    contracts && execContractInfo && execFunc
      ? execContractInfo.abi.find((f) => f.name === execFunc)
      : null;

  const execFuncArgs = props.txn
    ? parsedFunction?.args?.map((v) => v) || [props.txn.data?.slice(10)]
    : [];

  const etherscanUrl =
    chain.blockExplorers?.default?.url ?? 'https://etherscan.io';
  const address = (
    <Link isExternal href={etherscanUrl + '/address/' + props.txn?.to}>
      {props.txn?.to}
    </Link>
  );
  const selector = props.txn?.data?.slice(0, 10);
  const value = `${formatEther(props.txn?.value || BigInt(0))} ${
    chain?.nativeCurrency?.symbol
  }`;

  if (!contracts && !cannonInfo.isFetching) {
    return (
      <Box p={6} border="1px solid" borderColor="gray.600" bgColor="black">
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
              Selector: {selector}
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
      </Box>
    );
  }

  return (
    <Box p={6} border="1px solid" borderColor="gray.600" bgColor="black">
      <Box maxW="100%" overflowX="auto">
        <Box
          whiteSpace="nowrap"
          mb={execFuncFragment?.inputs?.length > 0 ? 4 : 0}
        >
          <Heading size="sm" fontFamily="mono" fontWeight="semibold" mb={1}>
            {`${parsedContract}.${execFunc}`}
          </Heading>
          <Text fontSize="xs" color="gray.300">
            <Text as="span" mr={3}>
              Target: {address}
            </Text>
            <Text as="span" mr={3}>
              Selector: {selector}
            </Text>
            <Text as="span">Value: {value}</Text>
          </Text>
        </Box>
        <Flex flexDirection={['column', 'column', 'row']} gap={8} height="100%">
          <Box flex="1" w={['100%', '100%', '50%']}>
            {(execFuncFragment?.inputs || []).map((_arg: any, i: number) => [
              <Box key={JSON.stringify(execFuncFragment.inputs[i])}>
                <FormControl mb="4">
                  <FormLabel fontSize="sm" mb={1}>
                    {execFuncFragment.inputs[i].name && (
                      <Text display="inline">
                        {execFuncFragment.inputs[i].name}
                      </Text>
                    )}
                    {execFuncFragment.inputs[i].type && (
                      <Text
                        fontSize="xs"
                        color="whiteAlpha.700"
                        display="inline"
                      >
                        {' '}
                        {execFuncFragment.inputs[i].type}
                      </Text>
                    )}
                  </FormLabel>
                  {_renderInput(
                    execFuncFragment.inputs[i].type,
                    execFuncArgs[i]
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
