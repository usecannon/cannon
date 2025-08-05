import { useCallback, useEffect, useState } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { Address, createPublicClient, formatUnits, parseUnits, zeroAddress } from 'viem';
import { CONTRACT_ADDRESSES, CANNON_SUBSCRIPTION_ABI, ERC20_ABI } from '@/constants/contracts';
import { useContractCall, useContractTransaction } from './ethereum';
import { useContractInteraction } from '@/features/Packages/interact/useContractInteraction';
import { useCannonChains } from '@/providers/CannonProvidersProvider';

export interface SubscriptionPlan {
  id: number;
  price: bigint;
  duration: number;
  quota: number;
  minTerms: number;
  maxTerms: number;
  active: boolean;
  refundable: boolean;
}

export interface SubscriptionMembership {
  planId: number;
  activeFrom: number;
  activeUntil: number;
  availableCredits: number;
}

export interface PricingData {
  plans: SubscriptionPlan[];
  userMembership: SubscriptionMembership | null;
  hasActiveMembership: boolean;
  userBalance: bigint;
  userAllowance: bigint;
  isLoading: boolean;
  error: string | null;
}

export function useSubscription() {
  const { address, isConnected } = useAccount();
  const { getChainById, transports } = useCannonChains();
  const chain = getChainById(10);
  const publicClient = createPublicClient({
    chain,
    transport: transports[10],
  });
  const { data: walletClient } = useWalletClient({ chainId: 10 });
  const [pricingData, setPricingData] = useState<PricingData>({
    plans: [],
    userMembership: null,
    hasActiveMembership: false,
    userBalance: 0n,
    userAllowance: 0n,
    isLoading: true,
    error: null,
  });

  // Get contract addresses for current chain
  const chainId = publicClient?.chain?.id ?? 0;
  const contractAddresses = chainId ? CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES] : null;

  // Contract call hooks
  const getPlan = useContractCall(
    contractAddresses?.CANNON_SUBSCRIPTION || '0x0000000000000000000000000000000000000000',
    'getPlan',
    [],
    0n,
    CANNON_SUBSCRIPTION_ABI,
    publicClient!
  );

  const getAvailablePlans = useContractCall(
    contractAddresses?.CANNON_SUBSCRIPTION || '0x0000000000000000000000000000000000000000',
    'getAvailablePlans',
    [],
    0n,
    CANNON_SUBSCRIPTION_ABI,
    publicClient!
  );

  const getMembership = useContractCall(
    contractAddresses?.CANNON_SUBSCRIPTION || '0x0000000000000000000000000000000000000000',
    'getMembership',
    [],
    0n,
    CANNON_SUBSCRIPTION_ABI,
    publicClient!
  );

  const checkActiveMembership = useContractCall(
    contractAddresses?.CANNON_SUBSCRIPTION || '0x0000000000000000000000000000000000000000',
    'hasActiveMembership',
    [],
    0n,
    CANNON_SUBSCRIPTION_ABI,
    publicClient!
  );

  const getBalance = useContractCall(
    contractAddresses?.USDC || '0x0000000000000000000000000000000000000000',
    'balanceOf',
    [],
    0n,
    ERC20_ABI,
    publicClient!
  );

  const getAllowance = useContractCall(
    contractAddresses?.USDC || '0x0000000000000000000000000000000000000000',
    'allowance',
    [],
    0n,
    ERC20_ABI,
    publicClient!
  );

  // Transaction hooks
  const purchaseMembershipInteraction = useContractInteraction({
    f: CANNON_SUBSCRIPTION_ABI.find((f) => f.name === 'purchaseMembership') as any,
    abi: CANNON_SUBSCRIPTION_ABI,
    address: contractAddresses?.CANNON_SUBSCRIPTION || zeroAddress,
    chainId: chainId,
    params: [0, 1], // Will be updated dynamically
    value: 0n,
    isFunctionReadOnly: false,
  });

  const cancelMembershipInteraction = useContractInteraction({
    f: CANNON_SUBSCRIPTION_ABI.find((f) => f.name === 'cancelMembership') as any,
    abi: CANNON_SUBSCRIPTION_ABI,
    address: contractAddresses?.CANNON_SUBSCRIPTION || zeroAddress,
    chainId: chainId,
    params: [],
    value: 0n,
    isFunctionReadOnly: false,
  });

  // Load pricing data
  const loadPricingData = useCallback(async () => {
    if (!contractAddresses || !publicClient || contractAddresses.CANNON_SUBSCRIPTION === zeroAddress) {
      setPricingData((prev) => ({ ...prev, isLoading: false, error: 'Network is not supported' }));
      return;
    }

    try {
      setPricingData((prev) => ({ ...prev, isLoading: true, error: null }));

      // Get available plans
      const availablePlansResult = await getAvailablePlans(address || '0x0000000000000000000000000000000000000000');
      const availablePlanIds = availablePlansResult.value || [];

      // Get plan details for each available plan
      const plans: SubscriptionPlan[] = [];
      for (const planId of availablePlanIds) {
        const planResult = await getPlan(planId);
        if (planResult.value) {
          const plan = planResult.value as any;
          plans.push({
            id: Number(plan.id),
            price: plan.price,
            duration: Number(plan.duration),
            quota: Number(plan.quota),
            minTerms: Number(plan.minTerms),
            maxTerms: Number(plan.maxTerms),
            active: plan.active,
            refundable: plan.refundable,
          });
        }
      }

      // Get user data if connected
      let userMembership: SubscriptionMembership | null = null;
      let hasActiveMembership = false;
      let userBalance = 0n;
      let userAllowance = 0n;

      if (isConnected && address) {
        // Get membership
        const membershipResult = await getMembership(address);
        if (membershipResult.value) {
          const membership = membershipResult.value as any;
          userMembership = {
            planId: Number(membership.planId),
            activeFrom: Number(membership.activeFrom),
            activeUntil: Number(membership.activeUntil),
            availableCredits: Number(membership.availableCredits),
          };
        }

        // Check if has active membership
        const hasActiveResult = await checkActiveMembership(address);
        hasActiveMembership = hasActiveResult.value || false;

        // Get balance and allowance
        const balanceResult = await getBalance(address);
        userBalance = balanceResult.value || 0n;

        const allowanceResult = await getAllowance(address);
        userAllowance = allowanceResult.value || 0n;
      }

      setPricingData({
        plans,
        userMembership,
        hasActiveMembership,
        userBalance,
        userAllowance,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error loading pricing data:', error);
      setPricingData((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load pricing data',
      }));
    }
  }, [
    contractAddresses,
    publicClient,
    address,
    isConnected,
    getAvailablePlans,
    getPlan,
    getMembership,
    checkActiveMembership,
    getBalance,
    getAllowance,
  ]);

  // Load data on mount and when dependencies change
  useEffect(() => {
    loadPricingData();
  }, [loadPricingData]);

  // Purchase membership function
  const purchase = useCallback(
    async (planId: number, amountOfTerms: number) => {
      if (!isConnected || !address) {
        throw new Error('Wallet not connected');
      }

      try {
        const result = await purchaseMembershipInteraction.submit();
        if (purchaseMembershipInteraction.callMethodResult?.error) {
          throw purchaseMembershipInteraction.callMethodResult.error;
        }

        // Reload data after purchase
        await loadPricingData();
        return result;
      } catch (error) {
        console.error('Error purchasing membership:', error);
        throw error;
      }
    },
    [isConnected, address, purchaseMembershipInteraction, loadPricingData]
  );

  // Cancel membership function
  const cancel = useCallback(async () => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    try {
      const result = await cancelMembershipInteraction.submit();
      if (cancelMembershipInteraction.callMethodResult?.error) {
        throw cancelMembershipInteraction.callMethodResult.error;
      }

      // Reload data after cancellation
      await loadPricingData();
      return result;
    } catch (error) {
      console.error('Error cancelling membership:', error);
      throw error;
    }
  }, [isConnected, address, cancelMembershipInteraction, loadPricingData]);

  // Format price for display
  const formatPrice = useCallback((price: bigint, decimals: number = 6) => {
    return formatUnits(price, decimals);
  }, []);

  // Calculate total price for multiple terms
  const calculateTotalPrice = useCallback((price: bigint, terms: number) => {
    return price * BigInt(terms);
  }, []);

  return {
    ...pricingData,
    purchase,
    cancel,
    formatPrice,
    calculateTotalPrice,
    reload: loadPricingData,
  };
}
