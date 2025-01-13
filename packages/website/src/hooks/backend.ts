import { SafeDefinition, useStore } from '@/helpers/store';
import { SafeABI } from '@/abi/Safe';
import { useSafeAddress } from '@/hooks/safe';
import { SafeTransaction } from '@/types/SafeTransaction';
import { toast } from 'sonner';
import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import _ from 'lodash';
import { useEffect, useMemo, useState, useCallback } from 'react';
import * as viem from 'viem';
import {
  useAccount,
  useChainId,
  useReadContract,
  useReadContracts,
  useSimulateContract,
  useSwitchChain,
  useWalletClient,
} from 'wagmi';

interface CannonSafeTransaction {
  txn: SafeTransaction;
  sigs: string[];
}

export function useSafeTransactions(safe: SafeDefinition | null, refetchInterval: number | false = false) {
  const stagingUrl = useStore((s) => s.settings.stagingUrl);

  const stagedQuery = useQuery({
    queryKey: ['staged', safe?.chainId, safe?.address],
    enabled: !!safe,
    queryFn: async () => {
      if (!safe) return [];
      const response = await axios.get<CannonSafeTransaction[]>(`${stagingUrl}/${safe.chainId}/${safe.address}`);
      return response.data;
    },
    refetchInterval,
  });

  const nonceQuery = useReadContract({
    address: safe?.address,
    chainId: safe?.chainId,
    abi: SafeABI,
    functionName: 'nonce',
  });

  const memoizedStaged = useMemo(() => {
    if (!stagedQuery.isSuccess || !nonceQuery.isSuccess || !Array.isArray(stagedQuery.data)) {
      return [];
    }
    const nonce = Number(nonceQuery.data || 0);
    return _.sortBy(
      stagedQuery.data.filter((t) => t.txn._nonce >= nonce),
      'txn._nonce'
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stagedQuery.isSuccess, nonceQuery.isSuccess, stagedQuery.isSuccess, nonceQuery.isSuccess]);

  const memoizedNextNonce = useMemo(() => {
    if (memoizedStaged.length === 0 && !nonceQuery.isSuccess) return null;
    const lastNonce = memoizedStaged.length ? _.last(memoizedStaged)?.txn._nonce : Number(nonceQuery.data || 0);
    return lastNonce ? lastNonce + 1 : null;
  }, [memoizedStaged, nonceQuery.data, nonceQuery.isSuccess]);

  const isFetched = stagedQuery.isFetched && nonceQuery.isFetched;
  const isSuccess = stagedQuery.isSuccess && nonceQuery.isSuccess;
  const isLoading = stagedQuery.isLoading || nonceQuery.isLoading;
  const stagedQueryRefetch = stagedQuery.refetch;
  const nonceQueryRefetch = nonceQuery.refetch;
  const refetch = useCallback(
    () => Promise.all([stagedQueryRefetch(), nonceQueryRefetch()]),
    [stagedQueryRefetch, nonceQueryRefetch]
  );

  return useMemo(
    () => ({
      isLoading,
      isSuccess,
      isFetched,
      refetch,
      nonce: BigInt(Number(nonceQuery.data || 0)),
      staged: memoizedStaged,
      nextNonce: memoizedNextNonce,
    }),
    [isLoading, isSuccess, isFetched, refetch, nonceQuery, memoizedStaged, memoizedNextNonce]
  );
}

export function useTxnStager(
  txn: Partial<SafeTransaction>,
  options: {
    safe: SafeDefinition | null;
    onSignComplete?: () => void;
  } = { safe: null }
) {
  const chainId = useChainId();
  const account = useAccount();
  const walletClient = useWalletClient();
  const safeAddress = useSafeAddress();
  const [signing, setSigning] = useState(false);
  const [alreadyStagedSigners, setAlreadyStagedSigners] = useState<viem.Address[]>([]);
  const queryChainId = options.safe?.chainId || chainId.toString();
  const querySafeAddress = options.safe?.address || safeAddress;
  const stagingUrl = useStore((s) => s.settings.stagingUrl);
  const currentSafe = useStore((s) => s.currentSafe);
  const {
    nonce,
    staged,
    refetch: refetchSafeTxs,
    isSuccess: isSuccessSafeTxs,
  } = useSafeTransactions((options.safe || currentSafe) as any);
  const { switchChainAsync } = useSwitchChain();

  const safeTxn: SafeTransaction = {
    to: txn.to || viem.zeroAddress,
    value: txn.value || '0',
    data: txn.data || '0x',
    operation: txn.operation || '0', // 0 = call, 1 = delegatecall
    safeTxGas: txn.safeTxGas || '0',
    baseGas: txn.baseGas || '0',
    gasPrice: txn.gasPrice || '0',
    gasToken: txn.gasToken || viem.zeroAddress,
    refundReceiver: querySafeAddress as any,
    // Since nonce can be 0, we need to check if the txn._nonce is defined with the nullish coalescing operator
    _nonce: txn._nonce ?? (staged.length ? Number(_.last(staged)?.txn?._nonce) + 1 : Number(nonce || 0)),
  };

  // try to match with an existing transaction
  const alreadyStaged = staged.find((s) => _.isEqual(s.txn, safeTxn));

  const reads = useReadContracts({
    contracts: [
      {
        abi: SafeABI,
        address: querySafeAddress as any,
        chainId: options.safe?.chainId,
        functionName: 'getTransactionHash',
        args: [
          safeTxn.to,
          safeTxn.value,
          safeTxn.data,
          safeTxn.operation,
          safeTxn.safeTxGas,
          safeTxn.baseGas,
          safeTxn.gasPrice,
          safeTxn.gasToken,
          safeTxn.refundReceiver,
          safeTxn._nonce,
        ],
      },
      {
        abi: SafeABI,
        address: querySafeAddress as any,
        chainId: options.safe?.chainId,
        functionName: 'getThreshold',
      },
      {
        abi: SafeABI,
        address: querySafeAddress as any,
        chainId: options.safe?.chainId,
        functionName: 'isOwner',
        args: [account.address] as any,
      },
    ],
  });

  const hashToSign = reads.isSuccess ? (reads.data![0].result as viem.Address) : null;

  useEffect(() => {
    if (!hashToSign || !alreadyStaged) return setAlreadyStagedSigners([]);

    void (async function () {
      const signers: viem.Address[] = [];
      for (const sig of alreadyStaged.sigs) {
        const signature = viem.toBytes(sig);
        signature[signature.length - 1] -= 4; // remove 4 at the end from gnosis signature version code
        const signerAddress = await viem.recoverAddress({
          hash: viem.hashMessage({
            raw: hashToSign as any, // TODO: fix type
          }),
          signature,
        });
        signers.push(signerAddress);
      }

      setAlreadyStagedSigners(signers);
    })();
  }, [alreadyStaged, alreadyStaged?.sigs, hashToSign]);

  const sigInsertIdx = _.sortedIndex(
    alreadyStagedSigners.map((s) => s.toLowerCase()),
    account.address?.toLowerCase()
  );

  const mutation = useMutation({
    mutationFn: async ({ txn, sig }: { txn: SafeTransaction; sig: string }) => {
      // see if there is a currently staged transaction matching ours
      if (!isSuccessSafeTxs) {
        return;
      }

      const newStaged = _.cloneDeep(alreadyStaged) || { txn, sigs: [] };
      newStaged.sigs.splice(sigInsertIdx, 0, sig);

      return await axios.post(`${stagingUrl}/${queryChainId}/${querySafeAddress}`, newStaged);
    },
    onSuccess: async () => {
      void refetchSafeTxs();
    },
  });

  const requiredSigs = reads.isSuccess ? (reads.data![1].result as unknown as bigint) : 0;

  const execSig: string[] = _.clone(alreadyStaged?.sigs || []);
  if (alreadyStagedSigners.length < requiredSigs) {
    const params = viem.encodeAbiParameters(viem.parseAbiParameters('address, uint256'), [
      account.address || viem.zeroAddress,
      BigInt(0),
    ]);

    execSig.splice(sigInsertIdx, 0, `${params}01`);
  }

  const execTransactionData = {
    abi: SafeABI,
    address: querySafeAddress as any,
    functionName: 'execTransaction',
    args: [
      safeTxn.to,
      BigInt(safeTxn.value.toString() || '0'),
      safeTxn.data,
      safeTxn.operation,
      safeTxn.safeTxGas,
      safeTxn.baseGas,
      safeTxn.gasPrice,
      safeTxn.gasToken,
      safeTxn.refundReceiver,
      '0x' + execSig.map((s) => s.slice(2)).join(''),
    ],
  };

  const stageTxnMutate = useSimulateContract(execTransactionData);

  // must not have already signed in order to sign
  const existingSigsCount = alreadyStaged ? alreadyStaged.sigs.length : 0;
  const isSigner =
    reads.isSuccess && !reads.isFetching && !reads.isRefetching ? (reads.data![2].result as unknown as boolean) : false;
  const alreadySigned = existingSigsCount >= requiredSigs;

  let signConditionFailed = '';
  if (!isSigner) {
    signConditionFailed = `Connected wallet ${account.address} not signer of this safe.`;
  } else if (!walletClient.data) {
    signConditionFailed = 'Wallet not connected.';
  } else if (alreadyStagedSigners.indexOf(account.address!) !== -1) {
    signConditionFailed = `Connected wallet ${account.address} has already signed the transaction.`;
  }

  let execConditionFailed = '';
  if (reads.isError) {
    execConditionFailed = `Prepare error: ${reads.failureReason}`;
  } else if (!reads.isSuccess || reads.isFetching || reads.isRefetching) {
    execConditionFailed = 'Loading transaction data, please wait...';
  } else if (!isSigner) {
    execConditionFailed = `Connected wallet ${account.address} not signer of this safe.`;
  } else if (existingSigsCount < requiredSigs && (signConditionFailed || existingSigsCount + 1 < requiredSigs)) {
    execConditionFailed = `Insufficient signers to execute (required: ${requiredSigs})`;
  } else if (stageTxnMutate.isError) {
    execConditionFailed = `Simulation error: ${stageTxnMutate.failureReason}`;
  }

  return {
    alreadySigned,
    isSigner,
    signConditionFailed,
    execConditionFailed,

    safeTxn,

    sign: async () => {
      if (signing) return;

      setSigning(true);
      try {
        if (currentSafe?.chainId !== account.chainId) {
          await switchChainAsync({
            chainId: currentSafe?.chainId as number,
          });
        }

        const signature = await walletClient.data!.signMessage({
          account: account.address,
          message: { raw: hashToSign as any },
        });

        const gnosisSignature = viem.toBytes(signature);

        // sometimes the signature comes back with a `v` of 0 or 1 when when it should 27 or 28, called a "recid" apparently
        // Allow a recid to be used as the v
        if (gnosisSignature[gnosisSignature.length - 1] < 27) {
          if (gnosisSignature[gnosisSignature.length - 1] === 0 || gnosisSignature[gnosisSignature.length - 1] === 1) {
            gnosisSignature[gnosisSignature.length - 1] += 27;
          } else {
            throw new Error(`signature invalid v byte ${signature}`);
          }
        }

        // gnosis for some reason requires adding 4 to the signature version code
        gnosisSignature[gnosisSignature.length - 1] += 4;

        await mutation.mutateAsync({
          txn: safeTxn,
          sig: viem.toHex(gnosisSignature),
        });

        if (options.onSignComplete) {
          options.onSignComplete();
        }
      } catch (e: any) {
        toast(e.message || 'Failed to sign transaction.');
      } finally {
        setSigning(false);
      }
    },

    signing,

    signMutation: mutation,

    existingSigners: alreadyStagedSigners,

    requiredSigners: requiredSigs,

    executeTxnConfig: stageTxnMutate.data?.request,

    execTransactionData: viem.encodeFunctionData(execTransactionData),
  };
}
