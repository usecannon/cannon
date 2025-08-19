import merge from 'deepmerge';
import deepEqual from 'fast-deep-equal';
import uniqWith from 'lodash/uniqWith';
import { Address, TransactionRequestBase, AbiFunction } from 'viem';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BuildState } from '@/hooks/cannon';
import { includes } from '@/helpers/array';
import { externalLinks } from '@/constants/externalLinks';

export type IdentifiableTxn = {
  txn: Omit<TransactionRequestBase, 'from'>;
  id: string;
  fn?: AbiFunction;
  params?: any[] | any;
  contractName?: string;
  target: string;
  chainId: number;
  pkgUrl: string;
};

export type SafeDefinition = {
  chainId: number;
  address: Address;
};

export type SafeTxService = {
  chainId: number;
  url: string;
};

export interface State {
  currentSafe: SafeDefinition | null;
  safeAddresses: SafeDefinition[];
  safeTxServices: SafeTxService[];
  build: {
    cid: string;
    buildState: BuildState;
  };
  settings: {
    ipfsApiUrl: string;
    isIpfsGateway: boolean;
    cannonSafeBackendUrl: string;
    customProviders: string[];
    customOtterscanAPIs: string[];
    pythUrl: string;
  };
}

export interface IpfsState {
  cid: string;
  content: string;
  compression: boolean;
  format: string;
}

export interface ipfsActions {
  download: (state: IpfsState, cid: string) => void;
  setState: (state: IpfsState, payload: Partial<IpfsState>) => void;
}

export interface Actions {
  setState: (state: Partial<State>) => void;
  setBuild: (build: Partial<State['build']>) => void;
  setSettings: (settings: Partial<State['settings']>) => void;
  setCurrentSafe: (safe: State['currentSafe']) => void;
  deleteSafe: (safeToDelete: State['currentSafe']) => void;
  prependSafeAddress: (safeToPrepend: State['currentSafe']) => void;
  setSafeTxServices: (services: SafeTxService[]) => void;
}

export interface QueueTxsActions {
  setLastQueuedTxnsId: ({ lastQueuedTxnsId, safeId }: { lastQueuedTxnsId: number; safeId: string }) => void;
  setQueuedIdentifiableTxns: ({
    queuedIdentifiableTxns,
    safeId,
  }: {
    queuedIdentifiableTxns: IdentifiableTxn[];
    safeId: string;
  }) => void;
}

export interface QueueTxsState {
  safes: {
    [safeId: string]: {
      lastQueuedTxnsId: number;
      queuedIdentifiableTxns: IdentifiableTxn[];
    };
  };
}

export type Store = State & Actions;
export type IpfsStore = IpfsState & ipfsActions;
export type QueueTxsStore = QueueTxsState & QueueTxsActions;

// Selector to get queued transactions and last queued transaction ID for the current safe
export const selectQueuedTransactions = (state: QueueTxsState & { currentSafe: SafeDefinition | null }) => {
  const { currentSafe } = state;
  if (!currentSafe?.address || !currentSafe?.chainId) {
    return {
      queuedIdentifiableTxns: [],
      lastQueuedTxnsId: 0,
    };
  }

  const safeId = `${currentSafe.chainId}:${currentSafe.address}`;
  const safeData = state.safes[safeId];

  return {
    queuedIdentifiableTxns: safeData?.queuedIdentifiableTxns || [],
    lastQueuedTxnsId: safeData?.lastQueuedTxnsId || 0,
  };
};

// Custom hook to get queued transactions
export const useQueuedTransactions = () => {
  const currentSafe = useStore((s) => s.currentSafe);
  return useQueueTxsStore((state) => selectQueuedTransactions({ ...state, currentSafe }));
};

export const initialState = {
  currentSafe: null,
  safeAddresses: [],
  safeTxServices: [],
  build: {
    cid: '',
    buildState: {
      status: 'idle',
      message: '',
    },
  },
  settings: {
    ipfsApiUrl: externalLinks.IPFS_CANNON,
    isIpfsGateway: false,
    cannonSafeBackendUrl: 'https://safe-staging.usecannon.com',
    customProviders: [],
    customOtterscanAPIs: ['https://evm.dbeal.dev/oVR6x7ZirgHZuY3abvLnQ06F/mainnet'],
    pythUrl: 'https://hermes.pyth.network',
  },
} satisfies State;

export const initialIpfsState = {
  cid: '',
  content: '',
  compression: false,
  format: 'text',
} satisfies IpfsState;

export const initialQueueTxsState = {
  safes: {},
} satisfies QueueTxsState;

const useIpfsStore = create<IpfsStore>()(
  persist(
    (set) => ({
      ...initialIpfsState,
      setState(state: IpfsState, payload: Partial<IpfsState>) {
        set({ ...state, ...payload });
      },
      download(state: IpfsState, cid: string) {
        if (state.cid === cid) {
          set({
            ...state,
          });
        } else {
          set({
            ...state,
            cid,
            content: '',
            compression: false,
            format: 'text',
          });
        }
      },
    }),
    {
      name: 'ipfs-state',
    }
  )
);

const useStore = create<Store>()(
  persist(
    (set) => ({
      ...initialState,
      setState: (newState) => set(newState),
      setBuild: (newState) => set((state) => ({ ...state, build: { ...state.build, ...newState } })),
      setSettings: (newState) =>
        set((state) => ({
          ...state,
          settings: { ...state.settings, ...newState },
        })),
      setCurrentSafe: (currentSafe) => {
        set((state) => {
          const newState = { ...state, currentSafe };

          if (currentSafe && !includes(state.safeAddresses, currentSafe)) {
            newState.safeAddresses = [currentSafe, ...newState.safeAddresses];
          }

          return newState;
        });
      },
      deleteSafe: (safeToDelete) => {
        set((state) => {
          const newState = { ...state };

          if (deepEqual(state.currentSafe, safeToDelete)) {
            newState.currentSafe = null;
          }

          newState.safeAddresses = newState.safeAddresses.filter((safe) => !deepEqual(safe, safeToDelete));

          return newState;
        });
      },
      prependSafeAddress: (newAddress) => {
        set((state) => ({
          ...state,
          safeAddresses: uniqWith([newAddress, ...state.safeAddresses], deepEqual).filter(
            (item) => item !== null
          ) as SafeDefinition[],
        }));
      },
      setSafeTxServices: (services) => {
        set((state) => ({
          ...state,
          safeTxServices: services,
        }));
      },
    }),
    // Persist only settings, current safe and safe addresses on local storage
    {
      name: 'cannon-state',
      partialize: (state) => ({
        settings: state.settings,
        currentSafe: state.currentSafe,
        safeAddresses: state.safeAddresses,
        safeTxServices: state.safeTxServices,
      }),
      merge: (persisted, initial) => merge(initial, persisted as Store) as Store,
    }
  )
);

const useQueueTxsStore = create<QueueTxsStore>()(
  persist(
    (set) => ({
      ...initialQueueTxsState,
      setLastQueuedTxnsId: ({ lastQueuedTxnsId, safeId }: { lastQueuedTxnsId: number; safeId: string }) => {
        set((state) => ({
          ...state,
          safes: {
            ...state.safes,
            [safeId]: {
              ...state.safes[safeId],
              lastQueuedTxnsId,
            },
          },
        }));
      },
      setQueuedIdentifiableTxns: ({
        queuedIdentifiableTxns,
        safeId,
      }: {
        queuedIdentifiableTxns: IdentifiableTxn[];
        safeId: string;
      }) => {
        set((state) => ({
          ...state,
          safes: {
            ...state.safes,
            [safeId]: {
              ...state.safes[safeId],
              queuedIdentifiableTxns,
            },
          },
        }));
      },
    }),
    {
      name: 'queue-txs-state',
    }
  )
);

export { useStore, useIpfsStore, useQueueTxsStore };
