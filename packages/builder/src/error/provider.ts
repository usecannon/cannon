import { BlockTag } from "@ethersproject/abstract-provider";
import { ethers } from "ethers";
import { Deferrable } from "ethers/lib/utils";
import { handleTxnError } from ".";
import { ChainArtifacts } from "../types";


export class CannonWrapperJsonRpcProvider extends ethers.providers.JsonRpcProvider {
    artifacts: ChainArtifacts;
    passThroughProvider: ethers.providers.JsonRpcProvider;

    constructor(artifacts: ChainArtifacts, ...args: ConstructorParameters<typeof ethers.providers.JsonRpcProvider>) {
        super(...args);

        this.artifacts = artifacts;

        // construct second uninhibited instance
        this.passThroughProvider = new ethers.providers.JsonRpcProvider(...args);
    }

    async waitForTransaction(transactionHash: string, confirmations?: number, timeout?: number): Promise<ethers.providers.TransactionReceipt> {
        try {
            return await super.waitForTransaction(transactionHash, confirmations, timeout);
        } catch(err) {
            throw handleTxnError(this.artifacts, this.passThroughProvider, err);
        }
    }

    async sendTransaction(signedTransaction: string | Promise<string>): Promise<ethers.providers.TransactionResponse> {
        try {
            return await super.sendTransaction(signedTransaction);
        } catch(err) {
            throw handleTxnError(this.artifacts, this.passThroughProvider, err);
        }
    }

    async estimateGas(transaction: Deferrable<ethers.providers.TransactionRequest>): Promise<ethers.BigNumber> {
        try {
            return await super.estimateGas(transaction);
        } catch(err) {
            throw handleTxnError(this.artifacts, this.passThroughProvider, err);
        }
    }

    async call(transaction: Deferrable<ethers.providers.TransactionRequest>, blockTag?: BlockTag | Promise<BlockTag>): Promise<string> {
        try {
            return await super.call(transaction, blockTag);
        } catch(err) {
            throw handleTxnError(this.artifacts, this.passThroughProvider, err);
        }
    }
}