import { HStack, Text } from '@chakra-ui/react';
import _ from 'lodash';
import { useState } from 'react';
import {
  Address,
  bytesToString,
  decodeFunctionData,
  encodeFunctionData,
  getFunctionSelector,
  Hex,
  hexToBytes,
  parseEther,
  stringToHex,
  TransactionRequestBase,
  trim,
} from 'viem';
import { useAccount } from 'wagmi';
import { useStore } from '@/helpers/store';
import { EditableAutocompleteInput } from '@/components/EditableAutocompleteInput';

export function DisplayedTransaction(props: {
  contracts: { [key: string]: { address: Address; abi: any[] } };
  txn?: Omit<TransactionRequestBase, 'from'>;
  onTxn?: (txn: Omit<TransactionRequestBase, 'from'> | null) => void;
  editable?: boolean;
}) {
  const currentSafe = useStore((s) => s.currentSafe);
  const account = useAccount();

  const parsedContractNames = props.txn
    ? Object.entries(props.contracts)
        .filter((c) => c[1].address === props.txn?.to)
        .map((v) => v[0])
    : '';

  let parsedContract = props.txn ? props.txn.to : '';
  let parsedFunction = null;
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

  const [execContract, setExecContract] = useState(parsedContract);
  const [execFunc, setExecFunc] = useState(
    props.txn
      ? parsedFunction
        ? parsedFunction.functionName.split('(')[0]
        : props.txn.data?.slice(0, 10)
      : ''
  );

  const execContractInfo = execContract ? props.contracts[execContract] : null;
  const execFuncFragment =
    execContractInfo && execFunc
      ? execContractInfo.abi.find((f) => f.name === execFunc)
      : null;

  const [execFuncArgs, setExecFuncArgs] = useState(
    props.txn
      ? parsedFunction?.args?.map((v) => v) || [props.txn.data?.slice(10)]
      : []
  );

  function selectExecFunc(label: string) {
    if (execFunc !== label) {
      setExecFunc(label);

      const abiFragment = execContractInfo?.abi.find((f) => f.name === label);

      if (props.onTxn) {
        if (!abiFragment?.inputs?.length) {
          // transaction is valid
          props.onTxn({
            to: execContractInfo?.address,
            data: getFunctionSelector(abiFragment),
          });
        } else {
          props.onTxn(null);
        }
      }
    }
  }

  function decodeArg(type: string, val: string) {
    console.log('decodearg', type, val);
    if (type.endsWith('[]')) {
      return JSON.parse(val);
    } else if (type.startsWith('bytes') && !val.startsWith('0x')) {
      return stringToHex(val || '', { size: 32 });
    }

    if (type == 'tuple') {
      try {
        return JSON.parse(val);
      } catch (err) {
        // ignore
      }
    } else if (type == 'bool') {
      return val === 'true';
    }

    return val;
  }

  function encodeArg(type: string, val: string): string {
    if (Array.isArray(val)) {
      if (!type.endsWith('[]')) {
        throw Error(`Invalid arg type "${type}" and val "${val}"`);
      }

      return `["${val
        .map((v) => encodeArg(type.slice(0, -2), v))
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
        console.warn('could not decode hex', err);
        return val.toString();
      }
    } else if (type == 'tuple') {
      // TODO: use a lib?
      return JSON.stringify(val, (_, v) =>
        typeof v === 'bigint' ? v.toString() : v
      );
    } else if (type == 'bool') {
      return val ? 'true' : 'false';
    }

    return val.toString();
  }

  function updateFuncArg(arg: number, val: string) {
    try {
      while (execFuncArgs.length < execFuncFragment.inputs.length) {
        execFuncArgs.push('');
      }

      while (execFuncArgs.length > execFuncFragment.inputs.length) {
        execFuncArgs.pop();
      }

      execFuncArgs[arg] = decodeArg(execFuncFragment.inputs[arg].type, val);

      setExecFuncArgs(_.clone(execFuncArgs));

      if (props.onTxn && !execFuncArgs.find((a) => a === '')) {
        // we have a valid transaction
        props.onTxn({
          to: execContractInfo?.address,
          data: encodeFunctionData({
            abi: [execFuncFragment],
            args: execFuncArgs,
          }),
        });
      }
    } catch (err) {
      console.log('arg handle fail', err);
    }
  }

  function generateArgOptions(arg: number) {
    if (execFuncFragment.inputs.length > arg) {
      if (
        execFuncFragment.inputs[arg].type.startsWith('uint') ||
        execFuncFragment.inputs[arg].type.startsWith('int')
      ) {
        // offer both the nubmer they are typing, and also the bigint version
        const num: any = execFuncArgs[arg] || '0';

        try {
          const res = [
            {
              label: parseEther(num).toString(),
              secondary: '18-decimal fixed',
            },
          ];

          if (!num.includes('.')) {
            res.unshift({ label: num.toString(), secondary: 'literal' });
          }

          return res;
        } catch (e) {
          return [{ label: num.toString(), secondary: 'literal' }];
        }
      }

      if (execFuncFragment.inputs[arg].type.endsWith('[]')) {
        try {
          return [
            { label: '[]', secondary: 'empty array' },
            {
              label:
                encodeArg(
                  execFuncFragment.inputs[arg].type,
                  (execFuncArgs[arg] as string) || ''
                ) || '',
              secondary: '',
            },
          ];
        } catch (e) {
          return [{ label: '[]', secondary: 'empty array' }];
        }
      }

      switch (execFuncFragment.inputs[arg].type) {
        case 'bool':
          return [
            { label: 'true', secondary: '' },
            { label: 'false', secondary: '' },
          ];
        case 'address':
          return [
            { label: execFuncArgs[arg] || '', secondary: '' },
            { label: currentSafe?.address ?? '', secondary: 'Safe Address' },
            { label: account.address ?? '', secondary: 'Your Address' },
            ...Object.entries(props.contracts).map(([l, c]) => ({
              label: c.address,
              secondary: l,
            })),
          ];
        case 'tuple':
          try {
            return typeof execFuncArgs[arg] === 'object' &&
              Object.keys(execFuncArgs[arg] as any).length
              ? [
                  {
                    label:
                      encodeArg(
                        execFuncFragment.inputs[arg].type,
                        (execFuncArgs[arg] as string) || ''
                      ) || '',
                    secondary: 'JSON',
                  },
                  { label: '{}', secondary: 'JSON' },
                ]
              : [{ label: '{}', secondary: 'JSON' }];
          } catch (e) {
            return [{ label: '{}', secondary: 'JSON' }];
          }
        default: // bytes32, string
          return [
            {
              label:
                encodeArg(
                  execFuncFragment.inputs[arg].type,
                  (execFuncArgs[arg] as string) || ''
                ) || '',
              secondary: '',
            },
          ];
      }
    }

    return [];
  }

  function extractFunctionNames(contractAbi: any[]) {
    return contractAbi
      .filter((a) => a.type === 'function' && a.stateMutability !== 'view')
      .map((a) => {
        return { label: a.name, secondary: getFunctionSelector(a) };
      });
  }

  return (
    <HStack fontFamily={'monospace'} gap={0} fontSize={20}>
      <EditableAutocompleteInput
        color="gray.200"
        defaultValue={execContract}
        tabKeys="."
        placeholder="Contract"
        items={Object.entries(props.contracts).map(([k, v]) => ({
          label: k,
          secondary: v.address,
        }))}
        onChange={(item) => setExecContract(item)}
        editable={props.editable}
      />
      <Text>.</Text>
      <EditableAutocompleteInput
        color="gray.200"
        defaultValue={execFunc}
        tabKeys="("
        placeholder="func"
        items={
          execContractInfo ? extractFunctionNames(execContractInfo.abi) : []
        }
        onChange={selectExecFunc}
        onPending={selectExecFunc}
        editable={props.editable}
      />
      <Text>(</Text>
      {(execFuncFragment?.inputs || []).map((arg: any, i: number) => [
        <EditableAutocompleteInput
          key={`input-${i}`}
          color="gray.200"
          defaultValue={encodeArg(
            execFuncFragment.inputs[i].type,
            (execFuncArgs[i] as string) || ''
          )}
          tabKeys=","
          placeholder={arg.name || arg.type || arg.internalType}
          items={generateArgOptions(i)}
          onFilterChange={(v) => {
            updateFuncArg(i, v);
          }}
          onChange={(v) => console.log('on change', updateFuncArg(i, v))}
          editable={props.editable}
          unfilteredResults
        />,
        <Text key={`text-${i}`}>
          {i < execFuncFragment.inputs.length - 1 ? ',' : ''}
        </Text>,
      ])}
      <Text>)</Text>
    </HStack>
  );
}
