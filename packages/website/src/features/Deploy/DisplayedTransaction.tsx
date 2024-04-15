import {
  Box,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Text,
} from '@chakra-ui/react';
import { a11yDark, CopyBlock } from 'react-code-blocks';
import {
  Address,
  bytesToString,
  decodeFunctionData,
  Hex,
  hexToBytes,
  TransactionRequestBase,
  trim,
} from 'viem';

export function DisplayedTransaction(props: {
  contracts?: { [key: string]: { address: Address; abi: any[] } };
  txn?: Omit<TransactionRequestBase, 'from'>;
}) {
  const parsedContractNames =
    props.txn && props.contracts
      ? Object.entries(props.contracts)
          .filter((c) => c[1].address === props.txn?.to)
          .map((v) => v[0])
      : '';

  let parsedContract = props.txn ? props.txn.to : '';
  let parsedFunction = null;
  if (props.contracts) {
    for (const n of parsedContractNames) {
      try {
        parsedFunction = decodeFunctionData({
          abi: props.contracts[n].abi,
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
    props.contracts && parsedContract ? props.contracts[parsedContract] : null;
  const execFuncFragment =
    props.contracts && execContractInfo && execFunc
      ? execContractInfo.abi.find((f) => f.name === execFunc)
      : null;

  const execFuncArgs = props.txn
    ? parsedFunction?.args?.map((v) => v) || [props.txn.data?.slice(10)]
    : [];

  if (!props.contracts) {
    return <Text>{props.txn?.data}</Text>;
  }

  return (
    <Box p={6} border="1px solid" borderColor="gray.600" bgColor="black">
      <Box maxW="100%" overflowX="auto">
        <Flex
          alignItems="center"
          mb={execFuncFragment?.inputs?.length > 0 ? 4 : 0}
        >
          <Heading size="sm" fontFamily="mono" fontWeight="semibold" mb={0}>
            {`${parsedContract}.${execFunc}`}
          </Heading>
        </Flex>
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
