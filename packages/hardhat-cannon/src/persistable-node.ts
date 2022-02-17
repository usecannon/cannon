import { HardhatNetworkProvider } from "hardhat/internal/hardhat-network/provider/provider";
import { HardhatNode } from "hardhat/internal/hardhat-network/provider/node.js";
import { Block, HeaderData } from "@ethereumjs/block";
import VM from '@ethereumjs/vm';
import { Address } from 'ethereumjs-util';

import { DefaultStateManager, StateManager } from "@ethereumjs/vm/dist/state";

import { SecureTrie as Trie, CheckpointTrie } from 'merkle-patricia-tree';

import BN from 'bn.js';
import { HardforkHistoryConfig, HardhatRuntimeEnvironment } from 'hardhat/types';
import { resolve } from "url";


import { getDifferenceInSeconds } from "hardhat/internal/util/date";

import {
    HARDHAT_NETWORK_DEFAULT_INITIAL_BASE_FEE_PER_GAS,
    HARDHAT_NETWORK_DEFAULT_MAX_PRIORITY_FEE_PER_GAS,
  } from "hardhat/internal/core/config/default-config";

import { makeForkClient } from "hardhat/internal/hardhat-network/provider/utils/makeForkClient";
import { makeForkCommon } from "hardhat/internal/hardhat-network/provider/utils/makeForkCommon";
import { makeStateTrie } from "hardhat/internal/hardhat-network/provider/utils/makeStateTrie";
import { makeCommon } from "hardhat/internal/hardhat-network/provider/utils/makeCommon";
import { isForkedNodeConfig, NodeConfig } from "hardhat/internal/hardhat-network/provider/node-types";
import Common from "@ethereumjs/common";
import { putGenesisBlock } from "hardhat/internal/hardhat-network/provider/utils/putGenesisBlock";


import { TxPool } from "hardhat/internal/hardhat-network/provider/TxPool";


import { HardhatBlockchainInterface } from "hardhat/internal/hardhat-network/provider/types/HardhatBlockchainInterface";
import { HardhatBlockchain } from "hardhat/internal/hardhat-network/provider/HardhatBlockchain";

import { ForkBlockchain } from "hardhat/internal/hardhat-network/provider/fork/ForkBlockchain";
import { ForkStateManager } from "hardhat/internal/hardhat-network/provider/fork/ForkStateManager";

const Codec = require('level-codec');

import {
    getHardforkName,
    hardforkGte,
    HardforkName,
  } from "hardhat/internal/util/hardforks";

interface SerializableNodeState {
    storage: { [key: string]: any }

    // timestamp is stored so that contracts do not get confused because of going back in time
    minTimestamp: number
}

export async function accessHreProvider(hre: HardhatRuntimeEnvironment): Promise<HardhatNetworkProvider> {
    
    let provider = hre.network.provider;

    // triggers init if not already run
    await provider.send('eth_blockNumber');

    // seacrh for node
    // @ts-ignore
    while (!provider._node) {
        // @ts-ignore
        provider = provider._provider || provider._wrapped || provider._wrappedProvider;

        if (!provider) {
            throw new Error('Hardhat Network must be in use to perform this operation');
        }
    }

    // @ts-ignore
    return provider;
}

export async function storeHreNode(hre: HardhatRuntimeEnvironment, node: HardhatNode): Promise<void> {
    const provider = accessHreProvider(hre);

    // @ts-ignore
    provider._node = node;
}

export async function dumpState(hre: HardhatRuntimeEnvironment): Promise<Buffer> {
    // @ts-ignore
    const node = (await accessHreProvider(hre))._node;

    const state: SerializableNodeState = {
        // note: would be best if `dumpState` or a similar function was supported within the state manager
        // itnode, but we have to hack it a bit here
        storage: await dumpStorage(node),
        minTimestamp: node.getTimeIncrement().toNumber(),
    };

    return Buffer.from(JSON.stringify(state));
}

export async function loadState(hre: HardhatRuntimeEnvironment, rawState: Buffer): Promise<boolean> {

    const state: SerializableNodeState = JSON.parse(rawState.toString('utf8'));

    /*hre.network.provider.send('evm_mine');

    const provider = await accessHreProvider(hre);

    // @ts-ignore
    const node = provider._node;

    // get genesis accounts config
    const config: NodeConfig = {
        // @ts-ignore
        automine: node.getAutomine(),
        blockGasLimit: node.getBlockGasLimit().toNumber(),
        // @ts-ignore
        chainId: node._configChainId,

        // @ts-ignore
        genesisAccounts: (await accessHreProvider(hre))._genesisAccounts,

        // @ts-ignore
        hardfork: provider._hardfork,
        minGasPrice: node.getGasPrice() as any,

        // @ts-ignore
        networkId: provider._networkId,

        // @ts-ignore
        networkName: provider._networkName,
        // @ts-ignore
        allowUnlimitedContractSize?: provider._allowUnlimitedContractSize,
        // @ts-ignore
        initialDate?: provider._initialDate,
        // @ts-ignore
        mempoolOrder: node._mempoolOrder,
        coinbase: node.getCoinbaseAddress().toString(),
        chains: new Map()
    }

    const [, newNode] = await createWithPersist(config, state);

    storeHreNode(hre, newNode);*/


    const provider = await accessHreProvider(hre);

    // @ts-ignore
    const node = provider._node;

    await importStorage(node, state.storage);
    await node._persistIrregularWorldState();




    //console.log('reached end of load function');



    // We add storage to the state, and ensure the timestamp is at least
    // later than the specified state


    /*const minTimestamp = new BN(state.minTimestamp);

    if (node.getNextBlockTimestamp().lt(minTimestamp as any)) {
        node.setNextBlockTimestamp(state.minTimestamp as any);
    }

    // regenesis (old history is no longer good)
    // @ts-ignore
    await node._blockchain.deleteBlock((await node._blockchain.getBlock(0)).hash());

    const header: HeaderData = {
        // @ts-ignore
        stateRoot: await node._stateManager.getStateRoot()
    };
  
    const genesisBlock = Block.genesis(
      {
        header,
      },
      {  }
    );

    console.log('genesisBlock', genesisBlock);

    // @ts-ignore
    await node._blockchain.addBlock(genesisBlock);


    /*this._irregularStatesByBlockNumber = snapshot.irregularStatesByBlockNumber;
    const irregularStateOrUndefined = this._irregularStatesByBlockNumber.get(
      (await this.getLatestBlock()).header.number.toString()
    );*/
    /*await this._stateManager.setStateRoot(
      irregularStateOrUndefined ?? snapshot.stateRoot
    );*/
    //this.setTimeIncrement(newOffset);
    //this.setNextBlockTimestamp(snapshot.nextBlockTimestamp);
    //this._txPool.revert(snapshot.txPoolSnapshotId);

    /*if (snapshot.userProvidedNextBlockBaseFeePerGas) {
      this.setUserProvidedNextBlockBaseFeePerGas(
        snapshot.userProvidedNextBlockBaseFeePerGas
      );
    } else {
      this._resetUserProvidedNextBlockBaseFeePerGas();
    }*/

    //this._coinbase = snapshot.coinbase;

    // We delete this and the following snapshots, as they can only be used
    // once in Ganache
    //this._snapshots.splice(snapshotIndex);*/

    return true;
}

async function dumpStorage(node: HardhatNode): Promise<{ [key: string]: any }> {
    const storage: { [key: string]: any } = {};

    // @ts-ignore
    if (node._stateManager._state) { // ForkStateManager
        // @ts-ignore
        for (const account of node._stateManager._state.entries()) {
            storage[account[0]] = account[1]; // todo
        }

    // @ts-ignore
    } else { // DefaultStateManager
        // @ts-ignore
        // before dumping we run `getStateRoot` which triggers a flush to the backend

        //console.log('recording state root', await node._stateManager.getStateRoot());

        // @ts-ignore
        const acc = await node._stateManager.getAccount(Address.fromString('0x5fbdb2315678afecb367f032d93f642f64180aa3'));
        /*console.log('dump storage', acc);

        console.log('fun', acc.codeHash.toString('hex'));
        // @ts-ignore
        console.log('codehash', await node._stateManager._trie.db.get(acc.codeHash));
        // @ts-ignore
        console.log('codehash2', Buffer.from(await node._stateManager._trie.db._leveldb.get(acc.codeHash, { keyEncoding: 'binary', valueEncoding: 'binary' }), 'binary'));*/
        
        // @ts-ignore
        storage.db = await trieDbDump(node._stateManager._trie);
        // @ts-ignore
        storage.root = await trieDump(node._stateManager._trie);
        
        // @ts-ignore
        /*for (const k in node._stateManager._storageTries) {
            // @ts-ignore
            storage[k] = await trieDump(node._stateManager._storageTries[k]);
        }*/
    }

    return storage;
}

function trieDbDump(trie: Trie): Promise<[string, string][]> {
    const dbData: [string, string][] = [];

    return new Promise((resolve, reject) => {
        trie.db._leveldb.createReadStream({ keyEncoding: 'binary', valueEncoding: 'binary' })
            .on('data', async (d: { key: string, value: string}) => {
                dbData.push([Buffer.from(d.key, 'binary').toString('hex'), Buffer.from(d.value, 'binary').toString('hex')])
            })
            .on('end', () => {
                resolve(dbData);
            });
    });
}

function trieDump(trie: Trie): Promise<[string, string][]> {
    const trieData: [string, string][] = [];
    //await new TrieReadStream(trie)

    return new Promise((resolve, reject) => {
        trie
            .createReadStream()
            .on('data', (d: { key: Buffer, value: Buffer}) => {
                //console.log(d.key.toString('hex'));

                trieData.push([d.key.toString('hex'), d.value.toString('hex')])
            })
            .on('end', () => {
                resolve(trieData);
            });
    });
}

async function importStorage(node: HardhatNode, storage: { [key: string]: any }) {
    // @ts-ignore
    if (node._stateManager._state) { // ForkStateManager

    } else { // DefaultStateManager

        // @ts-ignore
        await trieDbImport(node._stateManager._trie, storage.db);
        // @ts-ignore
        await trieImport(node._stateManager._trie, storage.root);

        //await trieImport

        /*console.log('SANITY');
        // @ts-ignore
        //console.log('the storage', (await node._stateManager._trie.get(Buffer.from('44e659e60b21cc961f64ad47f20523c1d329d4bbda245ef3940a76dc89d0911b', 'hex'))).toString('hex'));

        // @ts-ignore
        console.log('the storage2', (await node._stateManager._trie.get(Address.fromString('0x5fbdb2315678afecb367f032d93f642f64180aa3').buf)));
        // @ts-ignore
        const acc = await node._stateManager.getAccount(Address.fromString('0x5fbdb2315678afecb367f032d93f642f64180aa3'));
        console.log('dump storage', acc);

        console.log('fun', acc.codeHash.toString('hex'));
        // @ts-ignore
        console.log('codehash', await node._stateManager._trie.db.get(acc.codeHash));
        // @ts-ignore
        console.log('codehash2', Buffer.from(await node._stateManager._trie.db._leveldb.get(acc.codeHash, { keyEncoding: 'binary', valueEncoding: 'binary' }), 'binary'));*/

        /*for (const k in storage) {
            if (k == 'root') {
                // @ts-ignore
                await trieImport(node._stateManager._trie, storage.root);
            }
            /*else {
                // @ts-ignore

                // storage tries are simply caches apparently
                if (!node._stateManager._storageTries[k]) {
                    // @ts-ignore
                    node._stateManager._storageTries[k] = new Trie();
                }

                // @ts-ignore
                await trieImport(node._stateManager._storageTries[k], storage[k]);
            }
        }*/
    }
}

async function trieDbImport(trie: Trie, data: [string, string][]): Promise<void> {
    for (const [k, v] of data) {
        await trie.db._leveldb.put(Buffer.from(k, 'hex'), Buffer.from(v, 'hex'), { keyEncoding: 'binary', valueEncoding: 'binary'});
    }
}

async function trieImport(trie: Trie, data: [string, string][]): Promise<void> {
    for (const [k, v] of data) {
        await CheckpointTrie.prototype.put.call(trie, Buffer.from(k, 'hex'), Buffer.from(v, 'hex'));
    }
}

async function createWithPersist(config: NodeConfig, state: SerializableNodeState): Promise<[Common, HardhatNode]> {
    const {
        automine,
        genesisAccounts,
        blockGasLimit,
        allowUnlimitedContractSize,
        tracingConfig,
        minGasPrice,
        mempoolOrder,
        networkId,
        chainId,
    } = config;

    let common: Common;
    let stateManager: StateManager;
    let blockchain: HardhatBlockchainInterface;
    let initialBlockTimeOffset: BN | undefined;
    let nextBlockBaseFeePerGas: BN | undefined;
    let forkNetworkId: number | undefined;
    let forkBlockNum: number | undefined;
    let hardforkActivations: HardforkHistoryConfig = new Map();

    const initialBaseFeePerGasConfig =
        config.initialBaseFeePerGas !== undefined
        ? new BN(config.initialBaseFeePerGas)
        : undefined;

    const hardfork = getHardforkName(config.hardfork);

    if (isForkedNodeConfig(config)) {
        const { forkClient, forkBlockNumber, forkBlockTimestamp } =
            await makeForkClient(config.forkConfig, config.forkCachePath);
        common = await makeForkCommon(config);

        forkNetworkId = forkClient.getNetworkId();
        forkBlockNum = forkBlockNumber.toNumber();

        // @ts-ignore
        HardhatNode._validateHardforks(
            config.forkConfig.blockNumber,
            common,
            forkNetworkId
        );

        const forkStateManager = new ForkStateManager(
            forkClient,
            forkBlockNumber
        );
        await forkStateManager.initializeGenesisAccounts(genesisAccounts);
        stateManager = forkStateManager;

        blockchain = new ForkBlockchain(forkClient, forkBlockNumber, common);

        initialBlockTimeOffset = new BN(
            getDifferenceInSeconds(new Date(forkBlockTimestamp), new Date())
        );

        // If the hardfork is London or later we need a base fee per gas for the
        // first local block. If initialBaseFeePerGas config was provided we use
        // that. Otherwise, what we do depends on the block we forked from. If
        // it's an EIP-1559 block we don't need to do anything here, as we'll
        // end up automatically computing the next base fee per gas based on it.
        if (hardforkGte(hardfork, HardforkName.LONDON)) {
        if (initialBaseFeePerGasConfig !== undefined) {
            nextBlockBaseFeePerGas = initialBaseFeePerGasConfig;
        } else {
            const latestBlock = await blockchain.getLatestBlock();
            if (latestBlock.header.baseFeePerGas === undefined) {
            nextBlockBaseFeePerGas = new BN(
                HARDHAT_NETWORK_DEFAULT_INITIAL_BASE_FEE_PER_GAS
            );
            }
        }
        }

        if (config.chains.has(forkNetworkId)) {
            hardforkActivations = config.chains.get(forkNetworkId)!.hardforkHistory;
        }
    } else {
        const stateTrie = await makeStateTrie(genesisAccounts);

        // import given previous state
        await trieImport(stateTrie, state.storage.root);



        common = makeCommon(config, stateTrie);

        stateManager = new DefaultStateManager({
        common,
        trie: stateTrie,
        });

        const hardhatBlockchain = new HardhatBlockchain();

        const genesisBlockBaseFeePerGas = hardforkGte(
        hardfork,
        HardforkName.LONDON
        )
        ? initialBaseFeePerGasConfig ??
            new BN(HARDHAT_NETWORK_DEFAULT_INITIAL_BASE_FEE_PER_GAS)
        : undefined;

        await putGenesisBlock(
            hardhatBlockchain,
            common,
            genesisBlockBaseFeePerGas as any
        );

        if (config.initialDate !== undefined) {
        initialBlockTimeOffset = new BN(
            getDifferenceInSeconds(config.initialDate, new Date())
        );
        }

        blockchain = hardhatBlockchain;
    }

    const txPool = new TxPool(stateManager, new BN(blockGasLimit) as any, common);

    const vm = new VM({
        common,
        activatePrecompiles: true,
        stateManager,
        blockchain: blockchain as any,
        allowUnlimitedContractSize,
    });

    // @ts-ignore
    const node = new HardhatNode(
        vm,
        stateManager,
        blockchain,
        txPool,
        automine,
        minGasPrice,
        initialBlockTimeOffset,
        mempoolOrder,
        config.coinbase,
        genesisAccounts,
        networkId,
        chainId,
        hardforkActivations,
        tracingConfig,
        forkNetworkId,
        forkBlockNum,
        nextBlockBaseFeePerGas
    );

    return [common, node];
}