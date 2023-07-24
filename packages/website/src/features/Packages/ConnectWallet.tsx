import { FC } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
export const ConnectWallet: FC = () => {
  // TODO: apply styles
  //   <CBox>
  //     <CButton bg="cyan.600" variant-color="cyan" @click="connect">{{
  //     account
  //     ? `${account.substring(0, 6)}...${account.slice(-4)}`
  //     : 'Connect Wallet'
  //   }}</CButton>
  // </CBox>
  return <ConnectButton />;
};
