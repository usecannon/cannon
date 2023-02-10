import Web3Modal from "web3modal";
import WalletConnectProvider from "@walletconnect/web3-provider";
const ethers = require("ethers");

const providerOptions = {
    walletconnect: {
        package: WalletConnectProvider,
        options: {
            infuraId: "2ec6e503197e468ca2f04b8a017ee1b0"
        }
    }
};

const web3Modal = new Web3Modal({
    providerOptions
});

export const state = () => ({
    provider: null,
    providerOptions,
    chainId: 0
})

export const getters = {
    getProvider(state) {
        if (!state.provider) {
            return ethers.getDefaultProvider("homestead") // TODO: NEEDS SENSITIVIT TO state.chainId
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
    }
}

export const actions = {
    async connect({ state }) {
        state.provider = await web3Modal.connect();
    },
    async changeChainId({ state, commit }, chainId) {
        commit('setChainId', chainId);
    }
}