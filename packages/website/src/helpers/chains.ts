import * as chains from 'wagmi/chains';
import { set } from 'lodash';

set(chains, 'baseSepolia.blockExplorers.etherscan.url', 'https://sepolia.basescan.org');

export * from 'wagmi/chains';
export default chains;
