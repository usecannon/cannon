import React from 'react';
import { links } from '@/constants/links';
import { makeMultisend } from '@/helpers/multisend';
import { useQueueTxsStore, useStore } from '@/helpers/store';
import { useTxnStager } from '@/hooks/backend';
import { useCannonPackageContracts } from '@/hooks/cannon';
import { useSimulatedTxns } from '@/hooks/fork';
import { SafeTransaction } from '@/types/SafeTransaction';
import {
  IconButton,
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Container,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
  Input,
  InputGroup,
  InputRightElement,
  Spinner,
  Text,
  Tooltip,
  useToast,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  DrawerHeader,
  DrawerBody,
  useDisclosure,
  Button,
  Icon,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  AbiFunction,
  encodeAbiParameters,
  Hex,
  isAddress,
  TransactionRequestBase,
  zeroAddress,
} from 'viem';
import { useWriteContract } from 'wagmi';
import NoncePicker from './NoncePicker';
import { QueueTransaction } from './QueueTransaction';
import 'react-diff-view/style/index.css';
import { SafeAddressInput } from './SafeAddressInput';

const QueueDrawer = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const currentSafe = useStore((s) => s.currentSafe);
  const router = useRouter();
  const {
    queuedIdentifiableTxns,
    setQueuedIdentifiableTxns,
    lastQueuedTxnsId,
    setLastQueuedTxnsId,
    target,
    setTarget,
  } = useQueueTxsStore((s) => s);

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
      safe: currentSafe!,
      onSignComplete() {
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

  const execTxn = useWriteContract();

  const funcIsPayable = false;

  function updateQueuedTxn(
    i: number,
    txn: Omit<TransactionRequestBase, 'from'>,
    fn?: AbiFunction,
    params?: any[] | any,
    contractName?: string | null
  ) {
    setQueuedIdentifiableTxns(
      queuedIdentifiableTxns.map((item, index) =>
        index === i
          ? {
              ...item,
              txn,
              fn: fn || item.fn,
              params: params || item.params,
              contractName: contractName || item.contractName,
            }
          : item
      )
    );
  }

  const removeQueuedTxn = (i: number) => {
    setQueuedIdentifiableTxns(
      queuedIdentifiableTxns.filter((_, index) => index !== i)
    );
  };

  const addQueuedTxn = () => {
    setQueuedIdentifiableTxns([
      ...queuedIdentifiableTxns,
      { txn: {}, id: String(lastQueuedTxnsId + 1) },
    ]);
    setLastQueuedTxnsId(lastQueuedTxnsId + 1);
  };

  const txnHasError = !!txnInfo.txnResults.filter((r) => r?.error).length;

  const disableExecute =
    !targetTxn || txnHasError || !!stager.execConditionFailed;

  return (
    <>
      <IconButton
        onClick={onOpen}
        size="sm"
        variant="outline"
        background={'black'}
        borderColor={'gray.600'}
        aria-label="queue-txs"
        _hover={{
          background: 'teal.900',
          borderColor: 'teal.500',
        }}
        width={'fit-content'}
        transform="translateX(1px)"
        borderTopRightRadius={0}
        borderBottomRightRadius={0}
        icon={
          <Icon width="4" height="4" viewBox="0 0 39 40" fill="none">
            <path
              d="M2.22855 19.5869H6.35167C7.58312 19.5869 8.58087 20.6155 8.58087 21.8847V28.0535C8.58087 29.3227 9.57873 30.3513 10.8101 30.3513H27.2131C28.4445 30.3513 29.4424 31.3798 29.4424 32.6492V36.8993C29.4424 38.1685 28.4445 39.1971 27.2131 39.1971H9.86067C8.62922 39.1971 7.6457 38.1685 7.6457 36.8993V33.4893C7.6457 32.2201 6.64783 31.3196 5.41638 31.3196H2.22938C0.99805 31.3196 0.000190262 30.2911 0.000190262 29.0217V21.8581C0.000190262 20.5888 0.997223 19.5869 2.22855 19.5869Z"
              fill="white"
            />
            <path
              d="M29.4429 11.1437C29.4429 9.87434 28.4451 8.84578 27.2136 8.84578H10.8207C9.58924 8.84578 8.5915 7.81722 8.5915 6.54797V2.29787C8.5915 1.02853 9.58924 0 10.8207 0H28.164C29.3953 0 30.3932 1.02853 30.3932 2.29787V5.57274C30.3932 6.84199 31.3909 7.87055 32.6224 7.87055H35.7952C37.0266 7.87055 38.0244 8.89911 38.0244 10.1685V17.3398C38.0244 18.6092 37.0224 19.5861 35.791 19.5861H31.668C30.4365 19.5861 29.4387 18.5576 29.4387 17.2883L29.4429 11.1437Z"
              fill="white"
            />
            <path
              d="M20.9524 15.1196H16.992C15.7013 15.1196 14.6543 16.1997 14.6543 17.5293V21.6117C14.6543 22.942 15.7021 24.0212 16.992 24.0212H20.9524C22.243 24.0212 23.29 22.9411 23.29 21.6117V17.5293C23.29 16.1989 22.2422 15.1196 20.9524 15.1196Z"
              fill="white"
            />
          </Icon>
        }
        position="fixed"
        top="144px"
        right="0"
      />
      <Drawer onClose={onClose} isOpen={isOpen} size={'lg'} placement="right">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader bg="gray.800">
            Queue Transactions to a Safe
          </DrawerHeader>
          <DrawerBody bg="gray.800">
            <Container maxWidth="container.md">
              <Box mt={6} mb={6} display="block">
                <Heading size="md" mb={3}>
                  Safe
                </Heading>
                <SafeAddressInput />
              </Box>
              <Box mb={6}>
                <Text color="gray.300">
                  Transactions queued here will not generate a Cannon package
                  after execution.
                </Text>
              </Box>
              <Box
                mb={8}
                p={6}
                bg="gray.800"
                display="block"
                borderWidth="1px"
                borderStyle="solid"
                borderColor="gray.600"
                borderRadius="4px"
              >
                <FormControl>
                  <FormLabel>Cannon Package or Contract Address</FormLabel>
                  <InputGroup>
                    <Input
                      type="text"
                      borderColor="whiteAlpha.400"
                      background="black"
                      onChange={(event: any) => setTarget(event.target.value)}
                      value={target}
                    />
                    {!isAddress(target) &&
                      target.length >= 3 &&
                      cannonInfo.registryQuery.status === 'pending' && (
                        <InputRightElement>
                          <Spinner />
                        </InputRightElement>
                      )}
                  </InputGroup>

                  {!isAddress(target) &&
                    target.length >= 3 &&
                    cannonInfo.registryQuery.status === 'error' && (
                      <FormHelperText color="red.500">
                        Failed to find this package on the registry.
                      </FormHelperText>
                    )}
                </FormControl>
              </Box>
              {!isAddress(target) &&
                cannonInfo.pkgUrl &&
                cannonInfo.ipfsQuery.status === 'pending' && (
                  <Alert bg="gray.800" status="info" mt={6}>
                    <AlertIcon />
                    <Box>
                      <AlertTitle>Cannon Package Detected</AlertTitle>
                      <AlertDescription fontSize="sm">
                        Downloading {cannonInfo.pkgUrl}
                      </AlertDescription>
                    </Box>
                  </Alert>
                )}
              {!isAddress(target) &&
                cannonInfo.pkgUrl &&
                cannonInfo.ipfsQuery.status === 'error' && (
                  <Alert bg="gray.800" status="error" mt={6}>
                    <AlertIcon />
                    <Box>
                      <AlertTitle>Cannon Package Detected</AlertTitle>
                      <AlertDescription fontSize="sm">
                        Failed to load {cannonInfo.pkgUrl}
                      </AlertDescription>
                    </Box>
                  </Alert>
                )}
              {!isAddress(target) && cannonInfo.contracts && (
                <Box mt={6} mb={6} display="block">
                  <Heading size="md" mb={3}>
                    Transactions
                  </Heading>
                  {queuedIdentifiableTxns.map((queuedIdentifiableTxn, i) => (
                    <Box
                      key={i}
                      mb={8}
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
                        onChange={(txn, fn, params, contractName) =>
                          updateQueuedTxn(
                            i,
                            txn as any,
                            fn,
                            params,
                            contractName
                          )
                        }
                        isDeletable={queuedIdentifiableTxns.length > 1}
                        onDelete={() => removeQueuedTxn(i)}
                        txn={queuedIdentifiableTxn.txn}
                        fn={queuedIdentifiableTxn.fn}
                        params={queuedIdentifiableTxn.params}
                        contractName={queuedIdentifiableTxn.contractName}
                      />
                    </Box>
                  ))}
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
                </Box>
              )}
              {(isAddress(target) || cannonInfo.contracts) && (
                <Box>
                  {isAddress(target) && (
                    <Box mb="6">
                      {funcIsPayable && (
                        <FormControl>
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
                    </Box>
                  )}

                  {cannonInfo.contracts && (
                    <Box>
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
                                !targetTxn ||
                                txnHasError ||
                                !!stager.signConditionFailed
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
                            onClick={() => {
                              execTxn.writeContract(stager.executeTxnConfig!, {
                                onSuccess: () => {
                                  router.push(links.DEPLOY);

                                  toast({
                                    title:
                                      'You successfully executed the transaction.',
                                    status: 'success',
                                    duration: 5000,
                                    isClosable: true,
                                  });
                                },
                              });
                            }}
                          >
                            Execute
                          </Button>
                        </Tooltip>
                      </HStack>
                    </Box>
                  )}
                </Box>
              )}
            </Container>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default QueueDrawer;
