'use client';

import React, { Suspense } from 'react';
import { links } from '@/constants/links';
import { makeMultisend } from '@/helpers/multisend';
import { useQueueTxsStore, useStore } from '@/helpers/store';
import { useTxnStager } from '@/hooks/backend';
import { useCannonPackageContracts } from '@/hooks/cannon';
import { useSimulatedTxns } from '@/hooks/fork';
import { SafeTransaction } from '@/types/SafeTransaction';
import {
  IconButton,
  Box,
  FormControl,
  FormHelperText,
  FormLabel,
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
  Button,
  Icon,
} from '@chakra-ui/react';
import { AddIcon, InfoOutlineIcon } from '@chakra-ui/icons';
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
import WithSafe from '@/features/Deploy/WithSafe';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';

const QueuedTxns = ({ onDrawerClose }: { onDrawerClose: () => void }) => {
  const account = useAccount();
  const { openConnectModal } = useConnectModal();

  const currentSafe = useStore((s) => s.currentSafe);
  const router = useRouter();
  const {
    queuedIdentifiableTxns,
    setQueuedIdentifiableTxns,
    lastQueuedTxnsId,
    setLastQueuedTxnsId,
  } = useQueueTxsStore((s) => s);

  const [target, setTarget] = useState<string>('');

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
        onDrawerClose();
        router.push(links.DEPLOY);
        toast({
          title: 'You successfully signed the transaction.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });

        setQueuedIdentifiableTxns([]);
        setLastQueuedTxnsId(0);
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
    contractName?: string | null,
    target?: string | null,
    chainId?: number | null
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
              target: target || item.target,
              chainId: chainId || item.chainId,
            }
          : item
      )
    );
  }

  const removeQueuedTxn = (i: number) => {
    setQueuedIdentifiableTxns(
      queuedIdentifiableTxns.filter((_, index) => index !== i)
    );
    setLastQueuedTxnsId(lastQueuedTxnsId - 1);
  };

  const addQueuedTxn = () => {
    setQueuedIdentifiableTxns([
      ...queuedIdentifiableTxns,
      {
        txn: {},
        id: String(lastQueuedTxnsId + 1),
        chainId: currentSafe?.chainId as number,
        target,
      },
    ]);
    setLastQueuedTxnsId(lastQueuedTxnsId + 1);
  };

  const txnHasError = !!txnInfo.txnResults.filter((r) => r?.error).length;

  const disableExecute =
    !targetTxn || txnHasError || !!stager.execConditionFailed;

  return (
    <>
      <Box mt={6} mb={8} display="block">
        {queuedIdentifiableTxns.length > 0
          ? queuedIdentifiableTxns.map((queuedIdentifiableTxn, i) => (
              <Box
                key={i}
                mb={8}
                p={6}
                bg="gray.900"
                display="block"
                borderWidth="1px"
                borderStyle="solid"
                borderColor="gray.700"
                borderRadius="4px"
                position="relative"
              >
                <QueueTransaction
                  key={queuedIdentifiableTxn.id}
                  onChange={(txn, fn, params, contractName, target, chainId) =>
                    updateQueuedTxn(
                      i,
                      txn as any,
                      fn,
                      params,
                      contractName,
                      target,
                      chainId
                    )
                  }
                  onDelete={() => removeQueuedTxn(i)}
                  txn={queuedIdentifiableTxn.txn}
                  fn={queuedIdentifiableTxn.fn}
                  params={queuedIdentifiableTxn.params}
                  contractName={queuedIdentifiableTxn.contractName}
                  target={queuedIdentifiableTxn.target}
                  chainId={queuedIdentifiableTxn.chainId}
                  isDeletable
                />
              </Box>
            ))
          : null}

        <FormControl>
          <FormLabel>
            Add a transaction from a Cannon package or contract address
          </FormLabel>
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
            {!isAddress(target) && cannonInfo.contracts && (
              <InputRightElement>
                <IconButton
                  size="xs"
                  colorScheme="teal"
                  onClick={() => addQueuedTxn()}
                  icon={<AddIcon />}
                  aria-label="Add Transaction"
                />
              </InputRightElement>
            )}
          </InputGroup>
          {!isAddress(target) &&
            target.length >= 3 &&
            cannonInfo.registryQuery.status === 'error' && (
              <FormHelperText color="gray.300">
                Failed to find this package on the registry.
              </FormHelperText>
            )}
          {!isAddress(target) &&
            cannonInfo.pkgUrl &&
            cannonInfo.ipfsQuery.status === 'pending' && (
              <FormHelperText color="gray.300">
                Downloading {cannonInfo.pkgUrl}
              </FormHelperText>
            )}
          {!isAddress(target) &&
            cannonInfo.pkgUrl &&
            cannonInfo.ipfsQuery.status === 'error' && (
              <FormHelperText color="gray.300">
                Failed to load {cannonInfo.pkgUrl}
              </FormHelperText>
            )}
        </FormControl>
      </Box>
      <Box mb={4}>
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

        {queuedIdentifiableTxns.length > 0 && (
          <Box>
            <>
              {!account.isConnected ? (
                <Button
                  onClick={openConnectModal}
                  size="lg"
                  colorScheme="teal"
                  w="full"
                >
                  Connect Wallet
                </Button>
              ) : (
                <>
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
                            !!stager.signConditionFailed ||
                            queuedIdentifiableTxns.length === 0
                          }
                          onClick={() => stager.sign()}
                        >
                          Stage &amp; Sign
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

                  {stager.signConditionFailed && (
                    <Text fontSize="sm" mt={2} color="gray.300">
                      Can’t Sign: {stager.signConditionFailed}
                    </Text>
                  )}
                  {stager.execConditionFailed && (
                    <Text fontSize="sm" mt={2} color="gray.300">
                      Can’t Execute: {stager.execConditionFailed}
                    </Text>
                  )}

                  <Text mt={2} fontSize="sm" color="gray.300">
                    <InfoOutlineIcon transform="translateY(-1px)" />{' '}
                    Transactions queued here will not generate a Cannon package
                    after execution.
                  </Text>
                </>
              )}
            </>
          </Box>
        )}
      </Box>
    </>
  );
};

const QueueDrawer = ({
  isOpen,
  onOpen,
  onClose,
}: {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}) => {
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
          <DrawerCloseButton mt={1} />
          <DrawerHeader bg="gray.800">
            Stage Transactions to a Safe
          </DrawerHeader>
          <DrawerBody bg="gray.800" pt={4}>
            <Suspense fallback={<Spinner />}>
              <SafeAddressInput />
            </Suspense>
            <WithSafe>
              <QueuedTxns onDrawerClose={onClose} />
            </WithSafe>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default QueueDrawer;
