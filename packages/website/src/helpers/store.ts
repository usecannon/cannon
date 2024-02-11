import { deepmerge } from 'deepmerge-ts';
import deepEqual from 'fast-deep-equal';
import uniqWith from 'lodash/uniqWith';
import { Address } from 'viem';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { chains } from '@/constants/deployChains';
import { BuildState } from '@/hooks/cannon';
import { includes } from '@/helpers/array';

export type ChainId = (typeof chains)[number]['id'];

export type SafeDefinition = {
  chainId: number;
  address: Address;
};

export interface State {
  currentSafe: SafeDefinition | null;
  safeAddresses: SafeDefinition[];
  build: {
    cid: string;
    buildState: BuildState;
  };
  settings: {
    ipfsApiUrl: string;
    isIpfsGateway: boolean;
    stagingUrl: string;
    registryAddress: Address;
    customProviders: string[];
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
}

export type Store = State & Actions;
export type IpfsStore = IpfsState & ipfsActions;

export const initialState = {
  currentSafe: null,
  safeAddresses: [],
  build: {
    cid: '',
    buildState: {
      status: 'idle',
      message: '',
    },
  },
  settings: {
    ipfsApiUrl: 'https://repo.usecannon.com/',
    isIpfsGateway: false,
    stagingUrl: 'https://cannon-safe-app.external.dbeal.dev',
    registryAddress: '0x8E5C7EFC9636A6A0408A46BB7F617094B81e5dba',
    customProviders: [],
    pythUrl: 'https://hermes.pyth.network',
  },
} satisfies State;

export const initialIpfsState = {
  cid: '',
  content: '',
  compression: false,
  format: 'text',
} satisfies IpfsState;

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
    }),
    // Persist only settings, current safe and safe addresses on local storage
    {
      name: 'cannon-state',
      partialize: (state) => ({
        settings: state.settings,
        currentSafe: state.currentSafe,
        safeAddresses: state.safeAddresses,
      }),
      merge: (persisted, initial) => deepmerge(initial, persisted) as Store,
    }
  )
);

export { useStore, useIpfsStore };
