import { HardhatPlugin } from 'hardhat/types/plugins';
import { task } from 'hardhat/config';
import { TASK_BUILD } from './task-names.js';

const plugin: HardhatPlugin = {
  id: 'hardhat-cannon',
  hookHandlers: {
    config: () => import('./hooks/config.js')
  },
  tasks: [
    task(TASK_BUILD, 'Assemble a defined chain and save it to to a state which can be used later')
      .addPositionalArgument({
        name: 'cannonfile',
        description: 'Path to a cannonfile to build',
        defaultValue: 'cannonfile.toml'
      })
      .addVariadicArgument({
        name: 'settings',
        description: 'Custom settings for building the cannonfile',
        defaultValue: []
      })
      .addOption({
        name: 'registryPriority',
        description: '(Optional) Which registry should be used first? Default: onchain',
        defaultValue: 'onchain'
      })
      .addOption({
        name: 'anvilOptions',
        description: '(Optional) Custom anvil options string or json file or string to configure when running on the cannon network or a local forked node',
        defaultValue: '',
      })
      .addFlag({
        name: 'dryRun',
        description: 'Run a shadow deployment on a local forked node instead of actually deploying'
      })
      .addFlag({
        name: 'wipe',
        description: 'Do not reuse any previously built artifacts'
      })
      .addOption({
        name: 'upgradeFrom',
        description: '(Optional) Wipe the deployment files, and use the deployment files from another cannon package as base',
        defaultValue: ''
      })
      .addOption({
        name: 'impersonate',
        description: '(Optional) When dry running, uses forked signers rather than actual signing keys',
        defaultValue: ''
      })
      .addOption({
        name: 'writeScript',
        description: '(Experimental) Path to write all the operations taken as a script that can be later executed',
        defaultValue: ''
      })
      .addOption({
        name: 'writeScriptFormat',
        description: '(Experimental) Format in which to write the operations script (Options: json, ethers)',
        defaultValue: ''
      })
      .addFlag({
        name: 'noCompile',
        description: 'Do not execute hardhat compile before build',
      })
      .setAction(() => import('./tasks/build.js')).build()
  ],
  globalOptions: [

  ],
  conditionalDependencies: [

  ]
}

export default plugin;
