import SafeABIJSON from '@/abi/Safe.json';
import { SafeDefinition, useStore } from '@/helpers/store';
import { useSafeAddress } from '@/hooks/safe';
import { SafeTransaction } from '@/types/SafeTransaction';
import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import _ from 'lodash';
import { useEffect, useState } from 'react';
import * as viem from 'viem';
import { useAccount, useChainId, useReadContract, useReadContracts, useSimulateContract, useWalletClient } from 'wagmi';

const SafeABI = SafeABIJSON as viem.Abi;

export function useSafeTransactions(safe?: SafeDefinition) {
  const stagingUrl = useStore((s) => s.settings.stagingUrl);

  const stagedQuery = useQuery({
    queryKey: ['staged', safe?.chainId, safe?.address],
    queryFn: async () => {
      if (!safe) return;
      return axios.get(`${stagingUrl}/${safe.chainId}/${safe.address}`);
    },
  });

  const nonceQuery = useReadContract({
    address: safe?.address,
    chainId: safe?.chainId,
    abi: SafeABI,
    functionName: 'nonce',
  });

  const staged =
    stagedQuery.data && nonceQuery.data
      ? _.sortBy(
          stagedQuery.data.data.filter((t: any) => t.txn._nonce >= (nonceQuery as any).data),
          'txn._nonce'
        )
      : ([] as { txn: SafeTransaction; sigs: string[] }[]);

  return {
    nonceQuery,
    stagedQuery,
    nonce: nonceQuery.data as bigint,
    staged,
  };
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

  const [alreadySigned] = useState(false);
  const [alreadyStagedSigners, setAlreadyStagedSigners] = useState<viem.Address[]>([]);

  const queryChainId = options.safe?.chainId || chainId.toString();
  const querySafeAddress = options.safe?.address || safeAddress;

  const stagingUrl = useStore((s) => s.settings.stagingUrl);
  const currentSafe = useStore((s) => s.currentSafe);

  const { nonce, staged, stagedQuery } = useSafeTransactions((options.safe || currentSafe) as any);

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
    _nonce: txn._nonce || (staged.length ? _.last(staged).txn._nonce + 1 : Number(nonce || 0)),
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
          hash: viem.hashMessage({ raw: hashToSign }),
          signature,
        });
        signers.push(signerAddress);
      }

      setAlreadyStagedSigners(signers);
    })();
  }, [alreadyStaged?.sigs, hashToSign]);

  const sigInsertIdx = _.sortedIndex(
    alreadyStagedSigners.map((s) => s.toLowerCase()),
    account.address?.toLowerCase()
  );

  const mutation = useMutation({
    mutationFn: async ({ txn, sig }: { txn: SafeTransaction; sig: string }) => {
      // see if there is a currently staged transaction matching ours
      if (!stagedQuery.isSuccess) {
        return;
      }

      const newStaged = _.cloneDeep(alreadyStaged) || { txn, sigs: [] };
      newStaged.sigs.splice(sigInsertIdx, 0, sig);

      return await axios.post(`${stagingUrl}/${queryChainId}/${querySafeAddress}`, newStaged);
    },
    onSuccess: async () => {
      void stagedQuery.refetch();
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

  const stageTxnMutate = useSimulateContract({
    abi: SafeABI,
    address: querySafeAddress as any,
    functionName: 'execTransaction',
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
      '0x' + execSig.map((s) => s.slice(2)).join(''),
    ],
  });

  // must not have already signed in order to sign
  const existingSigsCount = alreadyStaged ? alreadyStaged.sigs.length : 0;
  const currentNonce = safeTxn._nonce != null && nonce == BigInt(safeTxn._nonce);
  const isSigner =
    reads.isSuccess && !reads.isFetching && !reads.isRefetching ? (reads.data![2].result as unknown as boolean) : false;

  let signConditionFailed = '';
  if (!isSigner) {
    signConditionFailed = `current wallet ${account.address} not signer of this safe`;
  } else if (!walletClient.data) {
    signConditionFailed = 'wallet not connected';
  } else if (alreadyStagedSigners.indexOf(account.address!) !== -1) {
    signConditionFailed = `current wallet ${account.address} has already signed the transaction`;
  }

  let execConditionFailed = '';
  if (!reads.isSuccess || reads.isFetching || reads.isRefetching || !currentNonce) {
    execConditionFailed = 'loading transaction data, please wait...';
  } else if (!isSigner) {
    execConditionFailed = `current wallet ${account.address} not signer of this safe`;
  } else if (existingSigsCount < requiredSigs && (signConditionFailed || existingSigsCount + 1 < requiredSigs)) {
    execConditionFailed = `insufficient signers to execute (required: ${requiredSigs})`;
  }

  return {
    alreadySigned,
    isSigner,
    signConditionFailed,
    execConditionFailed,

    safeTxn,

    sign: async () => {
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
    },

    signMutation: mutation,

    existingSigners: alreadyStagedSigners,

    requiredSigners: requiredSigs,

    executeTxnConfig: stageTxnMutate.data?.request,
  };
}
