import 'dotenv/config';
import * as viem from 'viem';
import { mainnet, optimism } from 'viem/chains';

export function getClients() {
  const { ETHEREUM_PROVIDER_URL, OPTIMISM_PROVIDER_URL } = process.env;

  if (typeof ETHEREUM_PROVIDER_URL !== 'string' || !ETHEREUM_PROVIDER_URL) {
    throw new Error('Missing RPC Provider url to use. Needs to have archival node, e.g. Alchemy.');
  }

  if (typeof OPTIMISM_PROVIDER_URL !== 'string' || !OPTIMISM_PROVIDER_URL) {
    throw new Error('Missing RPC Provider url to use. Needs to have archival node, e.g. Alchemy.');
  }

  const ethClient = viem.createPublicClient({
    chain: mainnet,
    transport: ETHEREUM_PROVIDER_URL!.startsWith('wss://')
      ? viem.webSocket(ETHEREUM_PROVIDER_URL)
      : viem.http(ETHEREUM_PROVIDER_URL),
  });

  const opClient = viem.createPublicClient({
    chain: optimism,
    transport: OPTIMISM_PROVIDER_URL!.startsWith('wss://')
      ? viem.webSocket(OPTIMISM_PROVIDER_URL)
      : viem.http(OPTIMISM_PROVIDER_URL),
  });

  return { ethClient, opClient } as {
    ethClient: viem.PublicClient;
    opClient: viem.PublicClient;
  };
}
