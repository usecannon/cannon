import { getAddress } from 'viem';

<Link isExternal href={getExplorerUrl(chain.id, getAddress(props.txn?.to || ''))}> 