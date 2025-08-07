import { useCannonChains } from '@/providers/CannonProvidersProvider';

export type Chain = ReturnType<ReturnType<typeof useCannonChains>['getChainById']>;
