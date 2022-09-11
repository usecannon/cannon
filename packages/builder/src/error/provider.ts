import { BlockTag } from '@ethersproject/abstract-provider';
import { ethers } from 'ethers';
import { Deferrable } from 'ethers/lib/utils';
import { handleTxnError } from '.';
import { ChainArtifacts } from '../types';

export class CannonWrapperJsonRpcProvider extends ethers.providers.JsonRpcProvider {
  artifacts: ChainArtifacts;
  readonly passThroughProvider: ethers.providers.JsonRpcProvider;

  constructor(artifacts: ChainArtifacts, ...args: ConstructorParameters<typeof ethers.providers.JsonRpcProvider>) {
    super(...args);

    this.artifacts = artifacts;

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
      return await handleTxnError(this.artifacts, this.passThroughProvider, err);
    }
  }

  override async sendTransaction(
    signedTransaction: string | Promise<string>
  ): Promise<ethers.providers.TransactionResponse> {
    try {
      return await super.sendTransaction(signedTransaction);
    } catch (err) {
      return await handleTxnError(this.artifacts, this.passThroughProvider, err);
    }
  }

  override async estimateGas(transaction: Deferrable<ethers.providers.TransactionRequest>): Promise<ethers.BigNumber> {
    try {
      return await super.estimateGas(transaction);
    } catch (err) {
      return await handleTxnError(this.artifacts, this.passThroughProvider, err);
    }
  }

  override async call(
    transaction: Deferrable<ethers.providers.TransactionRequest>,
    blockTag?: BlockTag | Promise<BlockTag>
  ): Promise<string> {
    try {
      return await super.call(transaction, blockTag);
    } catch (err) {
      return await handleTxnError(this.artifacts, this.passThroughProvider, err);
    }
  }

  override async perform(method: string, params: any) {
    try {
      return await super.perform(method, params);
    } catch (err) {
      return await handleTxnError(this.artifacts, this.passThroughProvider, err);
    }
  }
}
