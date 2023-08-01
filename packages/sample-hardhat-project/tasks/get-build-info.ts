import { task } from 'hardhat/config';

task('get-build-info', 'Gets build info from hardhat')
  .addPositionalParam('artifact', 'The artifact to get build info for')
  .setAction(async ({ artifact }, hre) => {
    //console.log(JSON.stringify(hre.run(TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOBS)));

    const artifactFile = artifact.split(':')[0];

    console.log(artifactFile);

    const dependencyGraph: any = await hre.run('compile:solidity:get-dependency-graph', { sourceNames: [artifactFile] });

    const resolvedFile = dependencyGraph.getResolvedFiles()[0];

    console.log(resolvedFile);

    const compileJob = await hre.run('compile:solidity:get-compilation-job-for-file', {
      file: resolvedFile,
      dependencyGraph
    });

    const res = await hre.run('compile:solidity:get-compiler-input', { compilationJob: compileJob });
    console.log(res);
  });
