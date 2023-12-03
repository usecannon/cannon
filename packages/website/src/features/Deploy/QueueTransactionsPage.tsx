'use client';

import { links } from '@/constants/links';
import { makeMultisend } from '@/helpers/multisend';
import { useStore } from '@/helpers/store';
import { useTxnStager } from '@/hooks/backend';
import { useCannonPackageContracts } from '@/hooks/cannon';
import { useSimulatedTxns } from '@/hooks/fork';
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
  Heading,
  HStack,
  Input,
  Text,
  Tooltip,
  useToast,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  encodeAbiParameters,
  Hex,
  isAddress,
  TransactionRequestBase,
  zeroAddress,
} from 'viem';
import { useContractWrite } from 'wagmi';
import NoncePicker from './NoncePicker';
import 'react-diff-view/style/index.css';
import { SafeTransaction } from '@/types/SafeTransaction';
import { QueueTransaction } from './QueueTransaction';

type IdentifiableTxn = {
  txn: Omit<TransactionRequestBase, 'from'>;
  id: string;
};

export default function QueueTransactionsPage() {
  return <QueueTransactions />;
}

function QueueTransactions() {
  const currentSafe = useStore((s) => s.currentSafe);
  const router = useRouter();

  const [target, setTarget] = useState('');

  const [lastQueuedTxnsId, setLastQueuedTxnsId] = useState(0);
  const [queuedIdentifiableTxns, setQueuedIdentifiableTxns] = useState<
    IdentifiableTxn[]
  >([{ txn: null as any, id: String(lastQueuedTxnsId) }]);

  const [pickedNonce, setPickedNonce] = useState<number | null>(null);

  const cannonInfo = useCannonPackageContracts(target, currentSafe?.chainId);

  const queuedTxns = queuedIdentifiableTxns
    .map((item) => item.txn)
    .filter((txn) => !!txn);

  const targetTxn: Partial<SafeTransaction> =
    queuedTxns.length > 0
      ? makeMultisend([
          {
            to: zeroAddress,
            data: encodeAbiParameters(
              [{ type: 'string[]' }],
              [['invoke', cannonInfo.pkgUrl || '']]
            ),
          } as Partial<TransactionRequestBase>,
          ...queuedTxns,
        ])
      : {};

  const txnInfo = useSimulatedTxns(currentSafe as any, queuedTxns);

  console.log('txns', queuedTxns);
  console.log('txnresults', txnInfo.txnResults);

  const toast = useToast();

  const stager = useTxnStager(
    targetTxn
      ? {
          to: targetTxn.to as `0x${string}`,
          value: targetTxn.value ? targetTxn.value.toString() : undefined,
          data: targetTxn.data,
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
          _nonce: pickedNonce === null ? undefined : pickedNonce,
        }
      : {},
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

  console.log('final tx:', stager.executeTxnConfig);

  const execTxn = useContractWrite(stager.executeTxnConfig);

  const funcIsPayable = false;

  function updateQueuedTxn(
    i: number,
    txn: Omit<TransactionRequestBase, 'from'>
  ) {
    setQueuedIdentifiableTxns((prev) => {
      const result = [...prev];
      result[i].txn = txn;
      return result;
    });
  }

  const removeQueuedTxn = (i: number) => {
    setQueuedIdentifiableTxns((prev) => {
      const result = [...prev];
      result.splice(i, 1);
      return result;
    });
  };

  const addQueuedTxn = () => {
    setQueuedIdentifiableTxns((prev) => [
      ...prev,
      { txn: {}, id: String(lastQueuedTxnsId + 1) },
    ]);
    setLastQueuedTxnsId((prev) => prev + 1);
  };

  const txnHasError = !!txnInfo.txnResults.filter((r) => r?.error).length;

  console.log('TXN HAS ERROR', txnHasError);
  console.log('sign status', stager);

  const disableExecute =
    !targetTxn || txnHasError || !!stager.execConditionFailed;

  useEffect(() => {
    if (!cannonInfo.contracts) {
      setQueuedIdentifiableTxns([
        { txn: null as any, id: String(lastQueuedTxnsId + 1) },
      ]);
      setLastQueuedTxnsId((prev) => prev + 1);
    }
  }, [cannonInfo.contracts]);

  return (
    <Container maxWidth="container.md" py={8}>
      <Box mb={6}>
        <Heading size="md" mb={2}>
          Queue Transactions
        </Heading>
        <Text fontSize="sm" color="gray.300">
          Transactions queued here will not generate a Cannon package after
          execution.
        </Text>
      </Box>
      <FormControl mb={6}>
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
      {!isAddress(target) && cannonInfo.pkgUrl && !cannonInfo.contracts && (
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
      {!isAddress(target) && cannonInfo.contracts && (
        <FormControl mb="8">
          <FormLabel>Transactions</FormLabel>
          {queuedIdentifiableTxns.map((queuedIdentifiableTxn, i) => (
            <Box
              key={i}
              mb={6}
              p={6}
              bg="gray.800"
              display="block"
              borderWidth="1px"
              borderStyle="solid"
              borderColor="gray.600"
              borderRadius="4px"
            >
              <QueueTransaction
                key={queuedIdentifiableTxn.id}
                contracts={(cannonInfo.contracts ?? {}) as any}
                onChange={(txn) => updateQueuedTxn(i, txn as any)}
                isDeletable={queuedIdentifiableTxns.length > 1}
                onDelete={() => removeQueuedTxn(i)}
              />
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
              onClick={() => addQueuedTxn()}
            >
              Add Transaction
            </Button>
          </HStack>
        </FormControl>
      )}
      {(isAddress(target) || funcIsPayable) && (
        <FormControl mb="4">
          <FormLabel>Value</FormLabel>
          <Input
            type="text"
            borderColor="whiteAlpha.400"
            background="black"
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
            borderColor="whiteAlpha.400"
            background="black"
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
          {stager.signConditionFailed && (
            <Alert bg="gray.800" status="error" mb={4}>
              <AlertIcon />
              <Box>
                <AlertTitle>Can’t Sign</AlertTitle>
                <AlertDescription fontSize="sm">
                  {stager.signConditionFailed}
                </AlertDescription>
              </Box>
            </Alert>
          )}
          {stager.execConditionFailed && (
            <Alert bg="gray.800" status="error" mb={4}>
              <AlertIcon />
              <Box>
                <AlertTitle>Can’t Execute</AlertTitle>
                <AlertDescription fontSize="sm">
                  {stager.execConditionFailed}
                </AlertDescription>
              </Box>
            </Alert>
          )}
          <NoncePicker
            safe={currentSafe as any}
            onPickedNonce={setPickedNonce}
          />
          <HStack gap="6">
            {disableExecute ? (
              <Tooltip label={stager.signConditionFailed}>
                <Button
                  size="lg"
                  colorScheme="teal"
                  w="100%"
                  isDisabled={
                    !targetTxn || txnHasError || !!stager.signConditionFailed
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
                colorScheme="teal"
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
