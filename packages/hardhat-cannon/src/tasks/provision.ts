import fs from 'fs-extra';

import { task, subtask } from "hardhat/config";
import { HardhatPluginError } from "hardhat/plugins";
import { TASK_PROVISION } from "../task-names";

import toml from '@iarna/toml';
import { ChainBuilder } from '../builder';
import _ from 'lodash';

task(TASK_PROVISION, "Assemble a defined chain and save it to to a state which can be used later")
.addOptionalParam("file", "TOML definition of the chain to assemble", "cannonfile.toml")
.addPositionalParam('label', 'Name of the image which is built')
.addOptionalVariadicPositionalParam('options', 'Key values of chain which should be built')
.setAction(async ({ label, file, options }, hre) => {
    const def = toml.parse(fs.readFileSync(file).toString('utf8'));

    console.log(JSON.stringify(def, null, 2));

    const builder = new ChainBuilder(label, def, hre);

    // options can be passed through commandline, or environment
    let mappedOptions: { [key: string]: string } = _.fromPairs((options || []).map((kv: string) => kv.split('=')));

    await builder.build(mappedOptions);
});
