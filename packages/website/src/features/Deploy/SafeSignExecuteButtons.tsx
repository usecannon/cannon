import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Check, X, ExternalLink } from 'lucide-react';
import { SafeDefinition, useStore } from '@/helpers/store';
import { SafeTransaction } from '@/types/SafeTransaction';
import { truncateAddress } from '@/helpers/ethereum';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CannonSafeTransaction, useTxnStager } from '@/hooks/backend';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import {
  useAccount,
  usePublicClient,
  useSwitchChain,
  useWriteContract,
} from 'wagmi';
import { toast } from 'sonner';
import { useState } from 'react';
import { Address, Hash } from 'viem';

const UnorderedNonceWarning = ({ nextNonce }: { nextNonce: number }) => (
  <Alert variant="warning" className="mt-3">
    <AlertDescription>
      You must execute transaction #{nextNonce} first.
    </AlertDescription>
  </Alert>
);

type Props = {
  safe: SafeDefinition;
  safeTxn: SafeTransaction | null;
  stager: ReturnType<typeof useTxnStager>;
  staged: CannonSafeTransaction[];
  signers: Address[];
  threshold: number;
  isTransactionExecuted: boolean;
  unorderedNonce: boolean | null;
  walletChainId: number;
  accountConnected: boolean;
  refetchSafeTxs: () => Promise<unknown>;
  refetchHistory: () => Promise<unknown>;
};

export function SafeSignExecuteButtons({
  safe,
  safeTxn,
  stager,
  staged,
  signers,
  threshold,
  isTransactionExecuted,
  unorderedNonce,
  walletChainId,
  accountConnected,
  refetchSafeTxs,
  refetchHistory,
}: Props) {
  const { getChainById, getExplorerUrl } = useCannonChains();
  const { openConnectModal } = useConnectModal();
  const account = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient();
  const writeContract = useWriteContract();
  const [executionTxnHash, setExecutionTxnHash] = useState<Hash | null>(null);

  const currentSafe = useStore((s) => s.currentSafe);
  const safeChain = getChainById(safe.chainId);
  const remainingSignatures = threshold - signers.length;

  if (!safeChain) {
    throw new Error('Safe Chain not supported');
  }

  const handleConnectOrSwitchChain = async () => {
    if (!account.isConnected) {
      if (openConnectModal) {
        openConnectModal();
      }

      toast.error('In order to sign you must connect your wallet first.', {
        duration: 5000,
      });

      return;
    }

    if (account.chainId !== currentSafe?.chainId.toString()) {
      try {
        await switchChainAsync({ chainId: currentSafe?.chainId || 1 });
      } catch (e) {
        toast.error(
          'Failed to switch chain, Your wallet must be connected to the same network as the selected Safe.',
          {
            duration: 5000,
          }
        );
        return;
      }
    }
  };

  const handleExecuteTx = () => {
    if (!stager.executeTxnConfig) {
      throw new Error('Missing execution tx configuration');
    }

    writeContract.writeContract(stager.executeTxnConfig, {
      onSuccess: async (hash) => {
        setExecutionTxnHash(hash);
        toast.success('Transaction sent to network', {
          duration: 5000,
        });

        // wait for the transaction to be mined
        await publicClient!.waitForTransactionReceipt({ hash });

        await refetchSafeTxs();
        await refetchHistory();

        toast.success('You successfully executed the transaction.', {
          duration: 5000,
        });

        setExecutionTxnHash(null);
      },
    });
  };

  const handleSign = async () => {
    await stager.sign();
    await refetchSafeTxs();
  };

  return (
    <Card className="rounded-sm">
      <CardHeader>
        <CardTitle>Signatures</CardTitle>
        <CardDescription>
          {isTransactionExecuted
            ? 'This transaction has been executed.'
            : remainingSignatures === 0
            ? 'This transaction is ready to be executed.'
            : `${remainingSignatures} additional ${
                remainingSignatures === 1 ? 'signature' : 'signatures'
              } required.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {executionTxnHash ? (
          <a
            href={getExplorerUrl(safeChain?.id, executionTxnHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium mt-3 hover:underline inline-flex items-center"
          >
            {truncateAddress(executionTxnHash as string, 8)}
            <X className="ml-1 transform -translate-y-[1px]" />
          </a>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {signers?.map((s) => (
                <div key={s}>
                  <div className="inline-flex items-center justify-center w-5 h-5 mr-2.5 bg-teal-500 rounded-full">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                  <span className="inline font-mono font-light text-gray-200">
                    {`${s.substring(0, 8)}...${s.slice(-6)}`}
                    <a
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-1.5 hover:text-gray-300"
                      href={getExplorerUrl(safeChain?.id, s)}
                    >
                      <ExternalLink className="inline" />
                    </a>
                  </span>
                </div>
              ))}
            </div>

            {!isTransactionExecuted && unorderedNonce && (
              <UnorderedNonceWarning nextNonce={staged?.[0]?.txn._nonce} />
            )}
          </>
        )}

        {!isTransactionExecuted && !executionTxnHash && (
          <div className="flex gap-4 mt-4">
            {accountConnected && walletChainId === safe.chainId ? (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex-1">
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={
                          stager.signing ||
                          stager.alreadySigned ||
                          executionTxnHash ||
                          ((safeTxn && !!stager.signConditionFailed) as any)
                        }
                        onClick={handleSign}
                      >
                        {stager.signing ? (
                          <>
                            Signing
                            <div className="ml-2 animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                          </>
                        ) : (
                          'Sign'
                        )}
                      </Button>
                    </div>
                  </TooltipTrigger>

                  {stager.signConditionFailed && (
                    <TooltipContent>
                      {stager.signConditionFailed}
                    </TooltipContent>
                  )}
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex-1">
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={
                          stager.signing ||
                          !stager.executeTxnConfig ||
                          executionTxnHash ||
                          ((safeTxn && !!stager.execConditionFailed) as any)
                        }
                        onClick={handleExecuteTx}
                      >
                        {remainingSignatures === 1
                          ? 'Sign and Execute'
                          : 'Execute'}
                      </Button>
                    </div>
                  </TooltipTrigger>
                  {stager.execConditionFailed && (
                    <TooltipContent>
                      {stager.execConditionFailed}
                    </TooltipContent>
                  )}
                </Tooltip>
              </>
            ) : (
              <Button className="w-full" onClick={handleConnectOrSwitchChain}>
                {accountConnected
                  ? `Switch to ${safeChain.name}`
                  : 'Connect Wallet'}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
