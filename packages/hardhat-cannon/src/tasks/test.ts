import { task } from 'hardhat/config';
import { TASK_TEST } from '../task-names';

const DEFAULT_CANNONFILE = 'cannonfile.toml';

task(TASK_TEST, 'Utility for running hardhat tests on the cannon network')
  .addOptionalPositionalParam('cannonfile', 'Path to a test cannonfile to build', DEFAULT_CANNONFILE)
  .addOptionalVariadicPositionalParam('settings', 'Custom settings for building the cannonfile', [])
  .addOptionalParam(
    'anvilOptions',
    '(Optional) Custom anvil options json string or json file to configure when running on the cannon network or a local forked node'
  )
  .addOptionalParam('registryPriority', '(Optional) Which registry should be used first?', 'local')
  .addFlag('noCompile', "Don't compile before running this task")
  .addOptionalParam('testFiles', 'An optional list of files separated by a comma to test')
  .addFlag('parallel', 'Run tests in parallel')
  .addFlag('bail', 'Stop running tests after the first test failure')
  .addOptionalParam('grep', 'Only run tests matching the given string or regexp')
  .setAction(async (params, hre) => {
    await hre.run('cannon:build', params);
    return await hre.run('test', params);
  });
