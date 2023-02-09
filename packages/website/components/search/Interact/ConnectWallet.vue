<template>
  <CBox>
    <CButton bg="cyan.600" variant-color="cyan" @click="connect"
      >Connect Wallet</CButton
    >
    <web3-modal-vue
      ref="web3modal"
      :theme="theme"
      :provider-options="providerOptions"
      cache-provider
    />
  </CBox>
</template>
    
<script lang="js">
import Web3 from "web3";
import Web3Modal from "web3modal";
import WalletConnectProvider from "@walletconnect/web3-provider";

const providerOptions = {
  walletconnect: {
    package: WalletConnectProvider, // required
    options: {
      infuraId: "INFURA_ID" // required
    }
  }
};

const web3Modal = new Web3Modal({
  network: "mainnet", // optional
  cacheProvider: true, // optional
  providerOptions // required
});

  export default {
    name: 'ConnectWallet',
    methods:{
      async connect(){
        const provider = await web3Modal.connect();
        const web3 = new Web3(provider);
      }
    }
  }
</script>