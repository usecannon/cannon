"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("hardhat/config");
const task_names_1 = require("../task-names");
(0, config_1.task)(task_names_1.TASK_CANNON, 'Provision the current deploy.json file using Cannon')
    .setAction(async (_, hre) => {
    // TODO: Load deploy.json file
});
//# sourceMappingURL=cannon.js.map