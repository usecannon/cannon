'use client';

import { AddIcon, MinusIcon } from '@chakra-ui/icons';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Button,
  Container,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Input,
  Tooltip,
  useToast,
} from '@chakra-ui/react';
import _ from 'lodash';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Abi,
  decodeErrorResult,
  encodeAbiParameters,
  Hex,
  isAddress,
  TransactionRequestBase,
  zeroAddress,
} from 'viem';
import { useContractWrite } from 'wagmi';
import 'react-diff-view/style/index.css';
import { links } from '@/constants/links';
import { useTxnStager } from '@/hooks/backend';
import { useCannonPackageContracts } from '@/hooks/cannon';
import { useSimulatedTxns } from '@/hooks/fork';
import { useStore } from '@/helpers/store';
import { makeMultisend } from '@/helpers/multisend';
import { DisplayedTransaction } from './DisplayedTransaction';
import NoncePicker from './NoncePicker';
import WithSafe from './WithSafe';

export default function QueueTransactionsPage() {
  return (
    <WithSafe>
      <QueueTransactions />
    </WithSafe>
  );
}

function QueueTransactions() {
  const currentSafe = useStore((s) => s.currentSafe);
  const router = useRouter();

  const [target, setTarget] = useState('');
  const [queuedTxns, setQueuedTxns] = useState<
    Omit<TransactionRequestBase, 'from'>[]
  >([null as any]);

  const [pickedNonce, setPickedNonce] = useState<number | null>(null);

  const settings = useStore((s) => s.settings);
  const cannonInfo = useCannonPackageContracts(
    target,
    `${currentSafe?.chainId}-${settings.preset}`
  );

  const multisendTxn =
    queuedTxns.indexOf(null as any) === -1
      ? makeMultisend(
          [
            {
              to: zeroAddress,
              data: encodeAbiParameters(
                [{ type: 'string[]' }],
                [['invoke', cannonInfo.pkgUrl || '']]
              ),
            } as Partial<TransactionRequestBase>,
          ].concat(queuedTxns)
        )
      : null;

  const txnInfo = useSimulatedTxns(currentSafe as any, queuedTxns);

  console.log('txns', queuedTxns);
  console.log('txnresults', txnInfo.txnResults);

  const toast = useToast();

  // TODO: check types
  const stager = useTxnStager(
    (multisendTxn
      ? {
          to: multisendTxn.to,
          value: multisendTxn.value.toString(),
          data: multisendTxn.data,
          safeTxGas: txnInfo.txnResults.length
            ? txnInfo.txnResults
                .reduce((prev, cur) => ({
                  gasUsed:
                    (prev?.gasUsed || BigInt(0)) + (cur?.gasUsed || BigInt(0)),
                  callResult: '0x',
                }))
                ?.gasUsed.toString()
            : undefined,
          operation: '1',
          _nonce: pickedNonce,
        }
      : {}) as any,
    {
      onSignComplete() {
        console.log('signing is complete, redirect');
        router.push(links.DEPLOY);
        toast({
          title: 'You successfully signed the transaction.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      },
    }
  );

  const execTxn = useContractWrite(stager.executeTxnConfig);

  const funcIsPayable = false;

  function updateQueuedTxn(
    i: number,
    txn: Omit<TransactionRequestBase, 'from'>
  ) {
    queuedTxns[i] = txn;
    setQueuedTxns(_.clone(queuedTxns));
  }

  const txnHasError = !!txnInfo.txnResults.filter((r) => r?.error).length;

  console.log('TXN HAS ERROR', txnHasError);
  console.log('sign status', stager);

  function decodeError(err: Hex) {
    for (const contract in cannonInfo.contracts) {
      try {
        const parsedError = decodeErrorResult({
          abi: cannonInfo.contracts[contract].abi as Abi,
          data: err,
        });

        return `failure in contract ${contract}: ${
          parsedError.errorName
        }(${parsedError.args?.join(', ')})`;
      } catch (err) {
        // ignore
      }
    }

    return 'unknown error';
  }

  const disableExecute =
    !multisendTxn || txnHasError || !!stager.execConditionFailed;

  return (
    <Container maxWidth="container.md" pb="12">
      <FormControl mb="8">
        <FormLabel>Cannon Package or Contract Address</FormLabel>
        <Input
          type="text"
          borderColor="whiteAlpha.400"
          background="black"
          onChange={(event: any) => setTarget(event.target.value)}
        />
        <FormHelperText color="gray.300">
          A package must have deployment data for the same network as your
          connected wallet.
        </FormHelperText>
      </FormControl>
      {cannonInfo.pkgUrl && !cannonInfo.contracts && (
        <Alert bg="gray.800" status="info">
          <AlertIcon />
          <Box>
            <AlertTitle>Cannon Package Detected</AlertTitle>
            <AlertDescription fontSize="sm">
              Downloading {cannonInfo.pkgUrl}
            </AlertDescription>
          </Box>
        </Alert>
      )}
      {cannonInfo.contracts && (
        <FormControl mb="8">
          <FormLabel>Transactions</FormLabel>
          {queuedTxns.map((_, i) => (
            <Box key={i} mb={3}>
              <DisplayedTransaction
                editable
                contracts={cannonInfo.contracts as any}
                onTxn={(txn) => updateQueuedTxn(i, txn as any)}
              />
              {txnInfo.txnResults &&
                txnInfo.txnResults.length === queuedTxns.length &&
                txnInfo.txnResults[i] &&
                txnInfo.txnResults[i]?.error && (
                  <Alert bg="gray.800" status="error" mt="6">
                    <AlertIcon />
                    Transaction Error:{' '}
                    {txnInfo.txnResults[i]?.callResult
                      ? decodeError(txnInfo.txnResults[i]?.callResult as any)
                      : txnInfo.txnResults[i]?.error}
                  </Alert>
                )}
            </Box>
          ))}
          <HStack my="3">
            <Button
              variant="outline"
              size="xs"
              colorScheme="green"
              color="green.400"
              borderColor="green.400"
              _hover={{ bg: 'green.900' }}
              leftIcon={<AddIcon />}
              onClick={() => setQueuedTxns(_.clone(queuedTxns.concat([{}])))}
            >
              Add Transaction
            </Button>
            {queuedTxns.length > 1 && (
              <Button
                variant="outline"
                size="xs"
                colorScheme="red"
                color="red.400"
                borderColor="red.400"
                _hover={{ bg: 'red.900' }}
                leftIcon={<MinusIcon />}
                onClick={() =>
                  setQueuedTxns(
                    _.clone(queuedTxns.slice(0, queuedTxns.length - 1))
                  )
                }
              >
                Remove Transaction
              </Button>
            )}
          </HStack>
        </FormControl>
      )}
      {(isAddress(target) || funcIsPayable) && (
        <FormControl mb="4">
          <FormLabel>Value</FormLabel>
          <Input
            type="text"
            onChange={(event: any) =>
              updateQueuedTxn(0, {
                ...queuedTxns[0],
                value: BigInt(event.target.value),
              })
            }
          />
          <FormHelperText>
            Amount of ETH to send as part of transaction
          </FormHelperText>
        </FormControl>
      )}
      {isAddress(target) && (
        <FormControl mb="4">
          <FormLabel>Transaction Data</FormLabel>
          <Input
            type="text"
            placeholder="0x"
            onChange={(event: any) =>
              updateQueuedTxn(0, {
                ...queuedTxns[0],
                data: (event.target.value as Hex) || '0x',
              })
            }
          />
          <FormHelperText>
            0x prefixed hex code data to send with transaction
          </FormHelperText>
        </FormControl>
      )}

      {(cannonInfo.contracts || isAddress(target)) && (
        <Box mb="6">
          <NoncePicker
            safe={currentSafe as any}
            onPickedNonce={setPickedNonce}
          />
          <HStack gap="6">
            {disableExecute ? (
              <Tooltip label={stager.signConditionFailed}>
                <Button
                  size="lg"
                  colorScheme="blue"
                  w="100%"
                  isDisabled={
                    !multisendTxn || txnHasError || !!stager.signConditionFailed
                  }
                  onClick={() => stager.sign()}
                >
                  Queue &amp; Sign
                </Button>
              </Tooltip>
            ) : null}
            <Tooltip label={stager.execConditionFailed}>
              <Button
                size="lg"
                colorScheme="blue"
                w="100%"
                isDisabled={disableExecute}
                onClick={async () => {
                  if (execTxn.writeAsync) {
                    await execTxn.writeAsync();
                    router.push(links.DEPLOY);
                    toast({
                      title: 'You successfully executed the transaction.',
                      status: 'success',
                      duration: 5000,
                      isClosable: true,
                    });
                  }
                }}
              >
                Execute
              </Button>
            </Tooltip>
          </HStack>
        </Box>
      )}
    </Container>
  );
}
