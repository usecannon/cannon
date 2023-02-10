import Web3Modal from "web3modal";
import WalletConnectProvider from "@walletconnect/web3-provider";
const ethers = require("ethers");

const INFURA_ID = "2ec6e503197e468ca2f04b8a017ee1b0";

const providerOptions = {
    walletconnect: {
        package: WalletConnectProvider,
        options: {
            infuraId: INFURA_ID
        }
    }
};

const web3Modal = new Web3Modal({
    providerOptions
});

export const state = () => ({
    provider: null,
    providerOptions,
    chainId: 0,
    account: null
})

export const getters = {
    getProvider(state) {
        if (!state.provider) {
            if (state.chainId == 13370) {
                return new ethers.providers.JsonRpcProvider('http://localhost:8545')
            }
            if (state.chainId == 420) {
                return new ethers.providers.JsonRpcProvider('https://goerli.optimism.io')
            }
            return ethers.getDefaultProvider(ethers.providers.getNetwork(state.chainId), { infura: INFURA_ID })
        }
        return state.provider
    },
    getChainId(state) {
        return state.chainId
    }
}

export const mutations = {
    setChainId(state, chainId) {
        state.chainId = chainId
    },
    setAccount(state, account) {
        state.account = account
    },
    setProvider(state, provider) {
        state.provider = provider
    }
}

export const actions = {
    async connect({ state, commit }) {
        const instance = await web3Modal.connect();
        const provider = new ethers.providers.Web3Provider(instance);
        commit('setProvider', {})

        /*
        let accounts = await state.provider.send("eth_requestAccounts", []);
        commit('setAccount', accounts[0]);

        state.provider.on('accountsChanged', function (accounts) {
            commit('setAccount', accounts[0]);
        });
        */
    },
    async changeChainId({ state, commit }, chainId) {
        commit('setChainId', chainId);
    }
}