
import { HardhatNode } from "hardhat/src/internal/hardhat-network/provider/node";

import { DefaultStateManager } from "@ethereumjs/vm/dist/state";

import { ForkStateManager } from "hardhat/src/internal/hardhat-network/provider/fork/ForkStateManager";

import BN from 'bn.js';

interface SerializableNodeState {
    storage: { [key: string]: any }

    // timestamp is stored so that contracts do not get confused because of going back in time
    minTimestamp: number
}

// @ts-ignore
export class PersistableHardhatNode extends HardhatNode {
    protected async dumpStorage(): Promise<{ [key: string]: any }> {

        const storage: { [key: string]: any } = {};

        // @ts-ignore
        if (this._stateManager instanceof ForkStateManager) {
            // @ts-ignore
            for (const account of this._stateManager._state.entries()) {
                storage[account[0]] = 
            }

        // @ts-ignore
        } else if (this._stateManager instanceof DefaultStateManager) { // DefaultStateManager
            // @ts-ignore
            const t = this._stateManager._trie.db._leveldb.iterator({
                keyAsBuffer: false,
                valueAsBuffer: true
            });

            storage.rootTrie = [];
            
            //.iterator({ keyAsBuffer: false, valueAsBuffer: false })

            // @ts-ignore
            for (const k in this._stateManager._storageTries) {
                // @ts-ignore
                const t = this._stateManager._trie.db._leveldb.iterator({
                    keyAsBuffer: false,
                    valueAsBuffer: true
                });

                storage[k] = [];
            }
        }

        return storage;
    }

    protected async importStorage(storage: { [key: string]: any }) {
        // @ts-ignore
        if (this._stateManager instanceof ForkStateManager) {
            
        } else { // DefaultStateManager

        }
    }
    
    public async dumpState(): Promise<string> {
        const state: SerializableNodeState = {
            // note: would be best if `dumpState` or a similar function was supported within the state manager
            // itself, but we have to hack it a bit here
            storage: await this.dumpStorage(),
            minTimestamp: this.getTimeIncrement().toNumber(),
        };

        return JSON.stringify(state);
    }

    public async loadState(rawState: string): Promise<boolean> {
        const state: SerializableNodeState = JSON.parse(rawState);

        // We add storage to the state, and ensure the timestamp is at least
        // later than the specified state

        this.importStorage(state.storage);

        const minTimestamp = new BN(state.minTimestamp);

        if (this.getNextBlockTimestamp().lt(minTimestamp as any)) {
            this.setNextBlockTimestamp(state.minTimestamp as any);
        }

        return true;
    }
}