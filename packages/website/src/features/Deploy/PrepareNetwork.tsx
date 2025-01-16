import { InfoCircledIcon } from '@radix-ui/react-icons';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  useGasPrice,
  usePrepareTransactionRequest,
  usePublicClient,
  useSendTransaction,
  useBytecode,
  useAccount,
  useSwitchChain,
} from 'wagmi';
import { useStore } from '@/helpers/store';
import * as onchainStore from '../../helpers/onchain-store';
import * as multicallForwarder from '../../helpers/trusted-multicall-forwarder';
import { useCallback, useEffect } from 'react';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const ARACHNID_CREATOR = '0x3fab184622dc19b6109349b94811493bf2a45362';
const DETERMINISTIC_DEPLOYER = '0x4e59b44847b379578588920ca78fbf26c0b4956c';

export default function PrepareNetwork({
  onNetworkPrepared,
}: {
  onNetworkPrepared: () => void;
}) {
  const { isConnected, chainId } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { switchChain } = useSwitchChain();
  const currentSafe = useStore((s) => s.currentSafe);
  // Uncomment the following line to use test with local network
  // const currentSafe = { chainId: 31337 };
  const { toast } = useToast();

  useEffect(() => {
    if (!isConnected && openConnectModal) {
      openConnectModal();
    }

    if (chainId !== currentSafe?.chainId) {
      switchChain({ chainId: currentSafe ? currentSafe.chainId : 1 });
    }
  }, [openConnectModal, isConnected, chainId]);

  const deterministicDeployerBytecode = useBytecode({
    chainId: currentSafe?.chainId,
    address: DETERMINISTIC_DEPLOYER,
  });
  const arachnidDeployed =
    (deterministicDeployerBytecode?.data?.length || 0) > 0;

  const gasPrice = useGasPrice();
  const publicClient = usePublicClient();
  const execTxnArachnid = useSendTransaction({
    mutation: {
      onSuccess: async () => {
        const hash = await publicClient!.sendRawTransaction({
          serializedTransaction:
            '0xf8a58085174876e800830186a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf31ba02222222222222222222222222222222222222222222222222222222222222222a02222222222222222222222222222222222222222222222222222222222222222',
        });

        await publicClient!.waitForTransactionReceipt({ hash });

        await deterministicDeployerBytecode.refetch();

        toast({
          title: 'Deterministic Deployer Deployed',
          description: 'The deterministic deployer has been deployed.',
          variant: 'default',
        });
      },
    },
  });

  const handleDeployArachnid = useCallback(() => {
    execTxnArachnid.sendTransaction({
      to: ARACHNID_CREATOR,
      // TODO: What is the right value here?
      value: BigInt(10000000000000000),
    });
  }, [
    isConnected,
    openConnectModal,
    chainId,
    currentSafe,
    switchChain,
    execTxnArachnid,
    gasPrice,
  ]);

  const onchainStoreBytecode = useBytecode({
    chainId: currentSafe?.chainId,
    address: onchainStore.deployAddress,
  });
  const onchainStoreDeployed = (onchainStoreBytecode?.data?.length || 0) > 0;
  const deployOnchainStore = usePrepareTransactionRequest({
    ...onchainStore.deployTxn,
    gasPrice: gasPrice.data,
    // TODO: What is the right value here?
    gas: BigInt(2000000),
  });
  const deployOnchainStoreTransaction = useSendTransaction({
    mutation: {
      onSuccess: async () => {
        await onchainStoreBytecode.refetch();

        toast({
          title: 'Onchain Store Deployed',
          description: 'The onchain store has been deployed.',
          variant: 'default',
        });
      },
    },
  });

  const handleDeployOnchainStore = () => {
    deployOnchainStoreTransaction.sendTransaction(
      deployOnchainStore.data as any
    );
  };

  const multicallForwarderBytecode = useBytecode({
    chainId: currentSafe?.chainId,
    address: multicallForwarder.deployAddress,
  });
  const multicallForwarderDeployed =
    (multicallForwarderBytecode?.data?.length || 0) > 0;
  const deployMulticallForwarder = usePrepareTransactionRequest({
    ...multicallForwarder.deployTxn,
    gasPrice: gasPrice.data,
    // TODO: What is the right value here?
    gas: BigInt(30000000),
  });
  const deployMulticallForwarderTransaction = useSendTransaction({
    mutation: {
      onSuccess: async () => {
        await multicallForwarderBytecode.refetch();

        toast({
          title: 'Multicall Forwarder Deployed',
          description: 'The multicall forwarder has been deployed.',
          variant: 'default',
        });
      },
    },
  });

  const handleDeployMulticallForwarder = () => {
    deployMulticallForwarderTransaction.sendTransaction(
      deployMulticallForwarder.data as any
    );
  };

  // Check if all contracts are deployed, then call onNetworkPrepared
  useEffect(() => {
    if (
      arachnidDeployed &&
      onchainStoreDeployed &&
      multicallForwarderDeployed
    ) {
      onNetworkPrepared();
    }
  }, [arachnidDeployed, onchainStoreDeployed, multicallForwarderDeployed]);

  return (
    <div className="flex h-full bg-background">
      <div className="container max-w-screen-xl mx-auto my-auto py-8">
        <h2 className="text-lg font-semibold mb-6 text-foreground drop-shadow-[0px_0px_4px_rgba(63,211,203,0.8)]">
          The web deployer needs some contracts on this chain. Anyone can deploy
          them.
        </h2>
        <div className="flex flex-col md:flex-row gap-8 flex-wrap">
          <Card className="flex-1 min-w-[320px] bg-muted border-border">
            <CardHeader>
              <CardTitle className="text-sm">
                Deterministic Deployment Proxy
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                This allows contracts to be deployed at consistent addresses,
                determined based on their source code.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 items-center">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={arachnidDeployed || execTxnArachnid.isPending}
                  onClick={handleDeployArachnid}
                  className="uppercase tracking-wider font-medium text-xs"
                >
                  {arachnidDeployed ? 'Deployed' : 'Deploy Contract'}
                </Button>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InfoCircledIcon className="text-muted-foreground h-4 w-4" />
                    </TooltipTrigger>
                    <TooltipContent>
                      This contract is deployed by sending a small amount of ETH
                      to an EOA with a known private key. Then the contract is
                      deployed from that address.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardContent>
          </Card>

          <Card className="flex-1 min-w-[320px] bg-muted border-border">
            <CardHeader>
              <CardTitle className="text-sm">
                Upgrade Verification Contract
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                This allows the deployer to record IPFS and git hashes onchain
                to verify the integrity of upgrades.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                size="sm"
                disabled={
                  !arachnidDeployed ||
                  onchainStoreDeployed ||
                  deployOnchainStore.isPending
                }
                onClick={handleDeployOnchainStore}
                className="uppercase tracking-wider font-medium text-xs"
              >
                {onchainStoreDeployed ? 'Deployed' : 'Deploy Contract'}
              </Button>
            </CardContent>
          </Card>

          <Card className="flex-1 min-w-[320px] bg-muted border-border">
            <CardHeader>
              <CardTitle className="text-sm">
                Trusted Multicall Forwarder
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                This allows users to create atomic batch transactions across
                integrated protocols, like the Cannon Registry.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                size="sm"
                disabled={
                  !arachnidDeployed ||
                  multicallForwarderDeployed ||
                  deployMulticallForwarder.isPending
                }
                onClick={handleDeployMulticallForwarder}
                className="uppercase tracking-wider font-medium text-xs"
              >
                {multicallForwarderDeployed ? 'Deployed' : 'Deploy Contract'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
