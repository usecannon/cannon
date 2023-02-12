import Vue from 'vue';
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
    cacheProvider: true,
    providerOptions
});

export const state = () => ({
    providerUrl: null,
    providerOptions,
    chainId: 0,
    account: null
})

export const getters = {
    getProviderUrl(state) {
        if (state.providerUrl) {
            return state.providerUrl
        }
        if (state.chainId == 13370) {
            return 'http://localhost:8545'
        }
        if (state.chainId == 420) {
            return 'https://goerli.optimism.io'
        }
        return ethers.getDefaultProvider(ethers.providers.getNetwork(state.chainId), { infura: INFURA_ID }).connection.url
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
    setProviderUrl(state, provider) {
        state.provider = provider
    }
}

export const actions = {
    async connect({ state, commit }, toast) {
        const instance = await web3Modal.connect();
        const provider = new ethers.providers.Web3Provider(instance);

        provider.on('accountsChanged', function (accounts) {
            commit('setAccount', accounts[0]);
        });

        commit('setProviderUrl', provider.connection.url)

        let accounts = await provider.send("eth_requestAccounts", []);
        commit('setAccount', accounts[0]);

        if (state.chainId) {
            await switchMetamaskChain(state.chainId, toast)
        }
    },
    async disconnect({ state, commit }, toast) {
        web3Modal.clearCachedProvider();
        commit('setProviderUrl', null);
        commit('setAccount', null);
    },
    async changeChainId({ state, commit }, chainId) {
        if (state.account) {
            await switchMetamaskChain(chainId, toast)
        }

        commit('setChainId', chainId);
    }
}

const switchMetamaskChain = async (chainId, toast) => {
    if (chainId == 13370) {
        try {
            await window.ethereum.request({
                method: "wallet_addEthereumChain",
                params: [{
                    chainId: '0x' + (13370).toString(16),
                    rpcUrls: ["http://localhost:8545"],
                    chainName: "Cannon",
                }]
            });
        } catch (error) {
            toast({
                title: 'Unable to connect',
                description: "Make sure you're running a local Cannon node.",
                status: 'error',
                duration: 10000
            })
            return
        }
    }

    await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x' + chainId.toString(16) }],    // chainId must be in HEX with 0x in front
    });
}