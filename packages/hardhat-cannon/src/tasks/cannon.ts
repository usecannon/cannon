import path from "path";
import { task, subtask } from "hardhat/config";
import { HardhatPluginError } from "hardhat/plugins";
import { SUBTASK_CANNON_LOAD_DEPLOY_FILE, TASK_NODE } from "../task-names";

subtask(SUBTASK_CANNON_LOAD_DEPLOY_FILE).setAction(async ({ file }, hre) => {
  const filepath = path.resolve(hre.config.paths.root, file);

  try {
    return await import(filepath);
  } catch (err: any) {
    if (err && err.code === "MODULE_NOT_FOUND") {
      throw new HardhatPluginError(
        "cannon",
        `Deployment file "${filepath}" not found.`
      );
    }
    throw err;
  }
});

task(TASK_NODE, "Provision the current deploy.json file using Cannon")
  .addOptionalParam("file", "Custom cannon deployment file.", "deploy.json")
  .setAction(async ({ file }, hre) => {
    const deploy = await hre.run(SUBTASK_CANNON_LOAD_DEPLOY_FILE, { file });

    // eslint-disable-next-line no-console
    console.log(JSON.stringify(deploy, null, 2));
  });
