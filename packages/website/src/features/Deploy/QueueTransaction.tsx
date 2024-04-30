import { useStore } from '@/helpers/store';
import { useSimulatedTxns } from '@/hooks/fork';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  IconButton,
  Flex,
  FormControl,
  FormLabel,
  Text,
  Tooltip,
} from '@chakra-ui/react';
import { CloseIcon } from '@chakra-ui/icons';
import { AbiFunction } from 'abitype/src/abi';
import {
  chakraComponents,
  ChakraStylesConfig,
  GroupBase,
  OptionProps,
  Select,
} from 'chakra-react-select';
import { useEffect, useState } from 'react';
import {
  Abi,
  Address,
  decodeErrorResult,
  encodeFunctionData,
  toFunctionSelector,
  Hex,
  TransactionRequestBase,
} from 'viem';
import { FunctionInput } from '../Packages/FunctionInput';
import 'react-diff-view/style/index.css';
import { useCannonPackageContracts } from '@/hooks/cannon';

type OptionData = {
  value: any;
  label: string;
  secondary: string;
};

const chakraStyles: ChakraStylesConfig<
  OptionData,
  boolean,
  GroupBase<OptionData>
> = {
  container: (provided) => ({
    ...provided,
    borderColor: 'gray.700',
    background: 'black',
    cursor: 'pointer',
  }),
  menuList: (provided) => ({
    ...provided,
    borderColor: 'whiteAlpha.400',
    background: 'black',
  }),
  groupHeading: (provided) => ({
    ...provided,
    background: 'black',
  }),
  option: (provided) => ({
    ...provided,
    color: 'white',
    background: 'black',
  }),
  dropdownIndicator: (provided) => ({
    ...provided,
    background: 'black',
  }),
  control: (provided) => ({
    ...provided,
    '& hr.chakra-divider': {
      display: 'none',
    },
  }),
};

function decodeError(err: Hex, abi: Abi) {
  try {
    const parsedError = decodeErrorResult({
      abi,
      data: err,
    });

    return `${parsedError.errorName}(${parsedError.args?.join(', ')})`;
  } catch (err) {
    // ignore
  }

  return 'unknown error';
}

export function QueueTransaction({
  onChange,
  isDeletable,
  onDelete,
  txn: tx,
  fn,
  params,
  contractName,
  contractAddress,
  target,
  chainId,
}: {
  onChange: (
    txn: Omit<TransactionRequestBase, 'from'> | null,
    fn: AbiFunction,
    params: any[] | any,
    contractName: string | null,
    target?: string,
    chainId?: number
  ) => void;
  isDeletable: boolean;
  onDelete: () => void;
  txn: Omit<TransactionRequestBase, 'from'> | null;
  fn?: AbiFunction;
  contractName?: string;
  contractAddress?: string;
  params?: any[] | any;
  target: string;
  chainId: number;
}) {
  const { contracts } = useCannonPackageContracts(target, chainId);

  const [selectedContractName, setSelectedContractName] = useState<
    string | null
  >(contractName || null);
  const [selectedFunction, setSelectedFunction] = useState<AbiFunction | null>(
    fn || null
  );
  const [selectedParams, setSelectedParams] = useState<any[]>(params || []);
  const [txn, setTxn] = useState<Omit<TransactionRequestBase, 'from'> | null>(
    tx || null
  );
  const [paramsEncodeError, setParamsEncodeError] = useState<string | null>();

  useEffect(() => {
    if (!selectedContractName) {
      setSelectedFunction(null);
      setSelectedParams([]);
    }
  }, [selectedContractName]);

  useEffect(() => {
    if (!selectedContractName) {
      setSelectedParams([]);
    }
  }, [selectedFunction]);

  useEffect(() => {
    let error: string | null = null;
    let _txn: Omit<TransactionRequestBase, 'from'> | null = null;

    if (selectedContractName && selectedFunction) {
      if (selectedFunction.inputs.length === 0) {
        _txn = {
          to: contracts
            ? contracts[selectedContractName].address
            : (tx?.to as Address),
          data: toFunctionSelector(selectedFunction),
        };
      } else {
        try {
          _txn = {
            to: contracts
              ? contracts[selectedContractName].address
              : (tx?.to as Address),
            data: encodeFunctionData({
              abi: [selectedFunction],
              args: selectedParams,
            }),
          };
        } catch (err: any) {
          error =
            typeof err === 'string'
              ? err
              : err?.message || err?.error?.message || err?.error || err;
        }
      }
    }

    setParamsEncodeError(error);
    setTxn(_txn);
    onChange(
      _txn,
      selectedFunction as any,
      selectedParams,
      selectedContractName
    );
  }, [
    selectedContractName,
    selectedFunction,
    selectedParams,
    contractAddress,
    txn?.to,
  ]);

  const currentSafe = useStore((s) => s.currentSafe);
  const txnInfo = useSimulatedTxns(currentSafe as any, txn ? [txn] : []);

  return (
    <Flex direction="column">
      <Flex alignItems="center">
        <Flex
          flexDirection="column"
          flex="1"
          w={['100%', '100%', '50%']}
          gap="10px"
        >
          <FormControl mb={2}>
            <FormLabel>Contract</FormLabel>
            <Select
              instanceId={'contract-name'}
              chakraStyles={chakraStyles}
              isClearable
              value={
                selectedContractName
                  ? {
                      value: selectedContractName,
                      label: selectedContractName,
                      secondary: `${chainId}:${
                        contracts
                          ? contracts[selectedContractName].address
                          : (txn?.to as Address)
                      }`,
                    }
                  : null
              }
              placeholder="Choose a contract..."
              options={
                contracts
                  ? Object.entries(contracts).map(([name, contract]) => ({
                      value: name,
                      label: name,
                      secondary: `${chainId}:${contract.address}`,
                    }))
                  : selectedContractName && txn?.to
                  ? [
                      {
                        value: selectedContractName,
                        label: selectedContractName,
                        secondary: `${chainId}:${txn.to}`,
                      },
                    ]
                  : []
              }
              onChange={(selected: any) =>
                setSelectedContractName(selected?.value || null)
              }
              components={{ Option: Option }}
            ></Select>
          </FormControl>
          <FormControl mb={2}>
            <FormLabel>Function</FormLabel>
            <Select
              instanceId={'function-name'}
              chakraStyles={chakraStyles}
              isClearable
              value={
                selectedFunction
                  ? {
                      value: selectedFunction,
                      label: selectedFunction.name,
                      secondary: toFunctionSelector(selectedFunction),
                    }
                  : null
              }
              placeholder="Choose a function..."
              options={
                contracts && selectedContractName
                  ? (contracts[selectedContractName].abi as AbiFunction[])
                      .filter(
                        (abi) =>
                          abi.type === 'function' &&
                          abi.stateMutability !== 'view'
                      )
                      .map((abi: AbiFunction) => ({
                        value: abi,
                        label: abi.name,
                        secondary: toFunctionSelector(abi),
                      }))
                  : selectedFunction
                  ? [
                      {
                        value: selectedFunction,
                        label: selectedFunction.name,
                        secondary: toFunctionSelector(selectedFunction),
                      },
                    ]
                  : []
              }
              onChange={(selected: any) =>
                setSelectedFunction(selected?.value || null)
              }
              components={{ Option: Option }}
            ></Select>
          </FormControl>
          {!!selectedFunction?.inputs?.length && (
            <FormControl mb={2}>
              <FormLabel>Parameters</FormLabel>
              {selectedFunction.inputs.map((input, index) => (
                <Box key={JSON.stringify(input)} mb={2}>
                  <FormLabel fontSize="sm" mb={1}>
                    {input.name && <Text display="inline">{input.name}</Text>}
                    {input.type && (
                      <Text
                        fontSize="xs"
                        color="whiteAlpha.700"
                        display="inline"
                      >
                        {' '}
                        {input.type}
                      </Text>
                    )}
                  </FormLabel>
                  <FunctionInput
                    key={JSON.stringify(input)}
                    input={input}
                    valueUpdated={(value) => {
                      const params = [...selectedParams];
                      params[index] = value;
                      setSelectedParams(params);
                    }}
                    initialValue={params[index]}
                  />
                </Box>
              ))}
            </FormControl>
          )}
          {paramsEncodeError && (
            <Alert bg="gray.900" status="error">
              <AlertIcon />
              <Box>
                <AlertTitle>Transaction Simulation Error</AlertTitle>
                <AlertDescription fontSize="sm">
                  {paramsEncodeError}
                </AlertDescription>
              </Box>
            </Alert>
          )}
          {txnInfo.txnResults &&
            txnInfo.txnResults[0] &&
            txnInfo.txnResults[0]?.error &&
            contracts && (
              <Alert bg="gray.900" status="error">
                <AlertIcon />
                <Box>
                  <AlertTitle>Transaction Simulation Error</AlertTitle>
                  <AlertDescription fontSize="sm">
                    {txnInfo.txnResults[0]?.callResult
                      ? decodeError(
                          txnInfo.txnResults[0]?.callResult as any,
                          contracts[selectedContractName!].abi
                        )
                      : txnInfo.txnResults[0]?.error}
                  </AlertDescription>
                </Box>
              </Alert>
            )}
          {isDeletable && (
            <Tooltip label="Remove transaction">
              <IconButton
                position="absolute"
                top={3}
                right={3}
                variant="outline"
                border="none"
                _hover={{ bg: 'gray.700' }}
                size="xs"
                colorScheme="red"
                color="red.400"
                onClick={onDelete}
                aria-label="Remove transaction"
                icon={<CloseIcon />}
              />
            </Tooltip>
          )}
        </Flex>
      </Flex>
    </Flex>
  );
}

function Option({ children, ...props }: OptionProps<OptionData>) {
  return (
    <chakraComponents.Option {...props}>
      <Flex direction="column">
        {children}
        <Text color="gray.600" fontSize="2xs">
          {props.data.secondary}
        </Text>
      </Flex>
    </chakraComponents.Option>
  );
}
