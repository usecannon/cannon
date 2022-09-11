var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { ethers } from "ethers";
import { handleTxnError } from ".";
export class CannonWrapperJsonRpcProvider extends ethers.providers.JsonRpcProvider {
    constructor(artifacts, ...args) {
        super(...args);
        this.artifacts = artifacts;
        // construct second uninhibited instance
        this.passThroughProvider = new ethers.providers.JsonRpcProvider(...args);
    }
    waitForTransaction(transactionHash, confirmations, timeout) {
        const _super = Object.create(null, {
            waitForTransaction: { get: () => super.waitForTransaction }
        });
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield _super.waitForTransaction.call(this, transactionHash, confirmations, timeout);
            }
            catch (err) {
                throw handleTxnError(this.artifacts, this.passThroughProvider, err);
            }
        });
    }
    sendTransaction(signedTransaction) {
        const _super = Object.create(null, {
            sendTransaction: { get: () => super.sendTransaction }
        });
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield _super.sendTransaction.call(this, signedTransaction);
            }
            catch (err) {
                throw handleTxnError(this.artifacts, this.passThroughProvider, err);
            }
        });
    }
    estimateGas(transaction) {
        const _super = Object.create(null, {
            estimateGas: { get: () => super.estimateGas }
        });
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield _super.estimateGas.call(this, transaction);
            }
            catch (err) {
                throw handleTxnError(this.artifacts, this.passThroughProvider, err);
            }
        });
    }
    call(transaction, blockTag) {
        const _super = Object.create(null, {
            call: { get: () => super.call }
        });
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield _super.call.call(this, transaction, blockTag);
            }
            catch (err) {
                throw handleTxnError(this.artifacts, this.passThroughProvider, err);
            }
        });
    }
}
