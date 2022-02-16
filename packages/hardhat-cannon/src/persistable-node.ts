import hre from 'hardhat';


import { HardhatNetworkProvider } from "hardhat/src/internal/hardhat-network/provider/provider";
import { HardhatNode } from "hardhat/src/internal/hardhat-network/provider/node";

import { DefaultStateManager } from "@ethereumjs/vm/dist/state";

import { ForkStateManager } from "hardhat/src/internal/hardhat-network/provider/fork/ForkStateManager";

import BN from 'bn.js';

interface SerializableNodeState {
    storage: { [key: string]: any }

    // timestamp is stored so that contracts do not get confused because of going back in time
    minTimestamp: number
}

export function accessHreNode(): HardhatNode {
    const provider = hre.network.provider;
    if (provider instanceof HardhatNetworkProvider) {
        // @ts-ignore
        return provider._node;
    }

    throw new Error('Hardhat Network must be in use to perform this operation');
}

export async function dumpState(): Promise<Buffer> {
    const node = accessHreNode();

    const state: SerializableNodeState = {
        // note: would be best if `dumpState` or a similar function was supported within the state manager
        // itnode, but we have to hack it a bit here
        storage: await dumpStorage(node),
        minTimestamp: node.getTimeIncrement().toNumber(),
    };

    return JSON.stringify(state);
}

export async function loadState(rawState: Buffer): Promise<boolean> {
    const node = accessHreNode();

    const state: SerializableNodeState = JSON.parse(rawState.toString('utf8'));

    // We add storage to the state, and ensure the timestamp is at least
    // later than the specified state

    importStorage(node, state.storage);

    const minTimestamp = new BN(state.minTimestamp);

    if (node.getNextBlockTimestamp().lt(minTimestamp as any)) {
        node.setNextBlockTimestamp(state.minTimestamp as any);
    }

    return true;
}

async function dumpStorage(node: HardhatNode): Promise<{ [key: string]: any }> {

    const storage: { [key: string]: any } = {};

    // @ts-ignore
    if (node._stateManager instanceof ForkStateManager) {
        // @ts-ignore
        for (const account of node._stateManager._state.entries()) {
            storage[account[0]] = 
        }

    // @ts-ignore
    } else if (node._stateManager instanceof DefaultStateManager) { // DefaultStateManager
        // @ts-ignore
        const t = node._stateManager._trie.db._leveldb.iterator({
            keyAsBuffer: false,
            valueAsBuffer: true
        });

        storage.rootTrie = [];
        
        //.iterator({ keyAsBuffer: false, valueAsBuffer: false })

        // @ts-ignore
        for (const k in node._stateManager._storageTries) {
            // @ts-ignore
            const t = node._stateManager._trie.db._leveldb.iterator({
                keyAsBuffer: false,
                valueAsBuffer: true
            });

            storage[k] = [];
        }
    }

    return storage;
}

async function importStorage(node: HardhatNode, storage: { [key: string]: any }) {
    // @ts-ignore
    if (node._stateManager instanceof ForkStateManager) {
        
    } else { // DefaultStateManager

    }
}