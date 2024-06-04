import React, { useEffect } from 'react';
import { connect, disconnect } from '@wagmi/core';
import { getE2eWagmiConfig } from './wagmi-mock-config';
import { useAccount } from 'wagmi';
const isE2ETest = process.env.NEXT_PUBLIC_E2E_TESTING_MODE === 'true';

/* Note
This was tried to be implemented as a step definition calling directly the connect/disconnect functions from wagmi, but it was not working.
So, we opted to create this component to be used in the app, and it will connect/disconnect the wallet based on the localStorage value.
*/
export default function E2EWalletConnector() {
  const { isConnected, isConnecting } = useAccount();

  const shouldConnect =
    localStorage.getItem('e2e-wallet-connected') === 'true' &&
    !isConnected &&
    !isConnecting;

  useEffect(() => {
    if (!isE2ETest) return;

    async function setConnectionState() {
      const web3Config = getE2eWagmiConfig();

      if (shouldConnect) {
        await connect(web3Config, {
          connector: web3Config.connectors[0],
        });
      } else {
        await disconnect(web3Config, {
          connector: web3Config.connectors[0],
        });
      }
    }

    void setConnectionState();
  }, [shouldConnect]);

  return <></>;
}
