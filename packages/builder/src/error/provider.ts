/*import { BlockTag, BlockWithTransactions } from '@ethersproject/abstract-provider';
import * as viem from 'viem';
import { Deferrable } from 'ethers/lib/utils';
import { ChainArtifacts } from '../types';
import { handleTxnError } from './';

export class CannonWrapperGenericProvider extends ethers.providers.Provider {
  artifacts: ChainArtifacts;
  readonly passThroughProvider: ethers.providers.Provider;

  readonly _isCannonWrapperProvider = true;

  constructor(artifacts: ChainArtifacts, passThroughProvider: ethers.providers.Provider, managedJsonRpc = true) {
    super();

    if ((passThroughProvider as CannonWrapperGenericProvider)._isCannonWrapperProvider) {
      throw new Error('wrapping a cannon wrapped provider with a wrapper.');
    }

    this.artifacts = artifacts;

    const connection = (passThroughProvider as ethers.providers.JsonRpcProvider).connection;

    if (connection && managedJsonRpc) {
      this.passThroughProvider = new CannonWrapperJsonRpcProvider(this, connection);
    } else {
      this.passThroughProvider = passThroughProvider;
    }
  }

  getNetwork(): Promise<ethers.providers.Network> {
    return this.passThroughProvider.getNetwork();
  }
  getBlockNumber(): Promise<number> {
    return this.passThroughProvider.getBlockNumber();
  }
  getGasPrice(): Promise<ethers.BigNumber> {
    return this.passThroughProvider.getGasPrice();
  }
  getBalance(
    addressOrName: string | Promise<string>,
    blockTag?: BlockTag | Promise<BlockTag> | undefined
  ): Promise<ethers.BigNumber> {
    return this.passThroughProvider.getBalance(addressOrName, blockTag);
  }
  getTransactionCount(
    addressOrName: string | Promise<string>,
    blockTag?: BlockTag | Promise<BlockTag> | undefined
  ): Promise<number> {
    return this.passThroughProvider.getTransactionCount(addressOrName, blockTag);
  }
  getCode(addressOrName: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag> | undefined): Promise<string> {
    return this.passThroughProvider.getCode(addressOrName, blockTag);
  }
  getStorageAt(
    addressOrName: string | Promise<string>,
    position: ethers.BigNumberish | Promise<ethers.BigNumberish>,
    blockTag?: BlockTag | Promise<BlockTag> | undefined
  ): Promise<string> {
    return this.passThroughProvider.getStorageAt(addressOrName, position, blockTag);
  }

  async sendTransaction(signedTransaction: string | Promise<string>): Promise<ethers.providers.TransactionResponse> {
    try {
      return await this.passThroughProvider.sendTransaction(signedTransaction);
    } catch (err) {
      return await handleTxnError(this.artifacts, this.passThroughProvider, err);
    }
  }

  async call(
    transaction: Deferrable<ethers.providers.TransactionRequest>,
    blockTag?: BlockTag | Promise<BlockTag>
  ): Promise<string> {
    try {
      return await this.passThroughProvider.call(transaction, blockTag);
    } catch (err) {
      return await handleTxnError(this.artifacts, this.passThroughProvider, err);
    }
  }

  async estimateGas(transaction: Deferrable<ethers.providers.TransactionRequest>): Promise<ethers.BigNumber> {
    try {
      return await this.passThroughProvider.estimateGas(transaction);
    } catch (err) {
      return await handleTxnError(this.artifacts, this.passThroughProvider, err);
    }
  }

  getBlock(blockHashOrBlockTag: BlockTag | Promise<BlockTag>): Promise<ethers.providers.Block> {
    return this.passThroughProvider.getBlock(blockHashOrBlockTag);
  }
  getBlockWithTransactions(blockHashOrBlockTag: BlockTag | Promise<BlockTag>): Promise<BlockWithTransactions> {
    return this.passThroughProvider.getBlockWithTransactions(blockHashOrBlockTag);
  }
  getTransaction(transactionHash: string): Promise<ethers.providers.TransactionResponse> {
    return this.passThroughProvider.getTransaction(transactionHash);
  }
  getTransactionReceipt(transactionHash: string): Promise<ethers.providers.TransactionReceipt> {
    return this.passThroughProvider.getTransactionReceipt(transactionHash);
  }
  getLogs(filter: ethers.providers.Filter): Promise<ethers.providers.Log[]> {
    return this.passThroughProvider.getLogs(filter);
  }
  resolveName(name: string | Promise<string>): Promise<string | null> {
    return this.passThroughProvider.resolveName(name);
  }
  lookupAddress(address: string | Promise<string>): Promise<string | null> {
    return this.passThroughProvider.lookupAddress(address);
  }
  on(eventName: ethers.providers.EventType, listener: ethers.providers.Listener): ethers.providers.Provider {
    return this.passThroughProvider.on(eventName, listener);
  }
  once(eventName: ethers.providers.EventType, listener: ethers.providers.Listener): ethers.providers.Provider {
    return this.passThroughProvider.once(eventName, listener);
  }
  emit(eventName: ethers.providers.EventType, ...args: any[]): boolean {
    return this.passThroughProvider.emit(eventName, ...args);
  }
  listenerCount(eventName?: ethers.providers.EventType | undefined): number {
    return this.passThroughProvider.listenerCount(eventName);
  }
  listeners(eventName?: ethers.providers.EventType | undefined): ethers.providers.Listener[] {
    return this.passThroughProvider.listeners(eventName);
  }
  off(eventName: ethers.providers.EventType, listener?: ethers.providers.Listener | undefined): ethers.providers.Provider {
    return this.passThroughProvider.off(eventName, listener);
  }
  removeAllListeners(eventName?: ethers.providers.EventType | undefined): ethers.providers.Provider {
    return this.passThroughProvider.removeAllListeners(eventName);
  }

  async waitForTransaction(
    transactionHash: string,
    confirmations?: number,
    timeout?: number
  ): Promise<ethers.providers.TransactionReceipt> {
    try {
      return await this.passThroughProvider.waitForTransaction(transactionHash, confirmations, timeout);
    } catch (err) {
      return await handleTxnError(this.artifacts, this.passThroughProvider, err);
    }
  }

  async send(method: string, params: any[]): Promise<any> {
    if ((this.passThroughProvider as ethers.providers.JsonRpcProvider).send) {
      return (this.passThroughProvider as ethers.providers.JsonRpcProvider).send(method, params);
    } else {
      throw new Error('tried to call `send` on non RPC endpoint');
    }
  }

  getSigner(address: string): ethers.Signer {
    if ((this.passThroughProvider as ethers.providers.JsonRpcProvider).getSigner) {
      return (this.passThroughProvider as ethers.providers.JsonRpcProvider).getSigner(address);
    } else {
      throw new Error('tried to call `getSigner` on non RPC endpoint');
    }
  }

  async listAccounts(): Promise<string[]> {
    if ((this.passThroughProvider as ethers.providers.JsonRpcProvider).listAccounts) {
      return (this.passThroughProvider as ethers.providers.JsonRpcProvider).listAccounts();
    } else {
      throw new Error('tried to call `listAccounts` on non RPC endpoint');
    }
  }
}

// this is needed so that we can initialize a provider that `JsonRpcSigner` instances will use
class CannonWrapperJsonRpcProvider extends ethers.providers.JsonRpcProvider {
  superProvider: CannonWrapperGenericProvider;
  readonly passThroughProvider: ethers.providers.JsonRpcProvider;

  constructor(
    superProvider: CannonWrapperGenericProvider,
    ...args: ConstructorParameters<typeof ethers.providers.JsonRpcProvider>
  ) {
    super(...args);

    this.superProvider = superProvider;

    // construct second uninhibited instance
    this.passThroughProvider = new ethers.providers.JsonRpcProvider(...args);
  }

  override async waitForTransaction(
    transactionHash: string,
    confirmations?: number,
    timeout?: number
  ): Promise<ethers.providers.TransactionReceipt> {
    try {
      return await super.waitForTransaction(transactionHash, confirmations, timeout);
    } catch (err) {
      return await handleTxnError(this.superProvider.artifacts, this.passThroughProvider, err);
    }
  }

  override async sendTransaction(
    signedTransaction: string | Promise<string>
  ): Promise<ethers.providers.TransactionResponse> {
    try {
      return await super.sendTransaction(signedTransaction);
    } catch (err) {
      return await handleTxnError(this.superProvider.artifacts, this.passThroughProvider, err);
    }
  }

  override async estimateGas(transaction: Deferrable<ethers.providers.TransactionRequest>): Promise<ethers.BigNumber> {
    try {
      return await super.estimateGas(transaction);
    } catch (err) {
      return await handleTxnError(this.superProvider.artifacts, this.passThroughProvider, err);
    }
  }

  override async call(
    transaction: Deferrable<ethers.providers.TransactionRequest>,
    blockTag?: BlockTag | Promise<BlockTag>
  ): Promise<string> {
    try {
      return await super.call(transaction, blockTag);
    } catch (err) {
      return await handleTxnError(this.superProvider.artifacts, this.passThroughProvider, err);
    }
  }

  override async perform(method: string, params: any) {
    try {
      return await super.perform(method, params);
    } catch (err) {
      return await handleTxnError(this.superProvider.artifacts, this.passThroughProvider, err);
    }
  }
}

// helper class to be able to use the builder's JsonRpcProvider from the local ethers
export class CannonJsonRpcProvider extends CannonWrapperGenericProvider {
  constructor(artifacts: ChainArtifacts, url: string) {
    const passThroughProvider = new ethers.providers.JsonRpcProvider(url);
    super(artifacts, passThroughProvider, true);
  }
}*/
