import { PersistableHardhatNode } from "../persistable-node";

export interface ChainBuilderContext {
    fork: boolean,
    settings: ChainBuilderOptions,

    outputs: {
        self: ChainBuilderOptions
        [module: string]: ChainBuilderOptions
    }
}

interface ChainBuilderOptions { [key: string]: string|number|boolean };

const INITIAL_CHAIN_BUILDER_CONTEXT: ChainBuilderContext = {
    fork: false,

    settings: {},
    outputs: { self: {} }
};

export class ChainBuilder {


    async build(): Promise<PersistableHardhatNode> {
        const ctx: ChainBuilderContext = INITIAL_CHAIN_BUILDER_CONTEXT;

        const createdNode = await PersistableHardhatNode.create({

        });

        // TODO: this downcast shouldn't work in JS, ideas how to work around?
        // almost might be better to not extend the class like this.
        const node = createdNode[1] as PersistableHardhatNode;

        // 1. read all settings

        // 2. read all imports



        // 3. complete rest of steps in order given: contracts, runs, keeper config

        for (const i = 0;i < ;i++) {

        }

        // create/export cached snapshot after step 2, and again for every operation in step 3

        // return value hands reigns of running network to whatever called this

        return node;
    }
}