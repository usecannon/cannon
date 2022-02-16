import fs from 'fs';

import { task, subtask } from "hardhat/config";
import { HardhatPluginError } from "hardhat/plugins";
import { TASK_PROVISION } from "../task-names";

import toml from '@iarna/toml';
import { ChainBuilder } from '../builder';

task(TASK_PROVISION, "Assemble a defined chain and save it to to a state which can be used later")
.addOptionalParam("file", "TOML definition of the chain to assemble", "cannonfile.toml")
.setAction(async ({ file }, hre) => {
    const def = toml.parse(fs.readFileSync(file).toString('utf8'));

    console.log(JSON.stringify(def, null, 2));

    // const builder = new ChainBuilder(def);

    // const node = await builder.build();
});
