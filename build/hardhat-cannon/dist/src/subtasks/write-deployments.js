"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const config_1 = require("hardhat/config");
const task_names_1 = require("../task-names");
const printer_1 = require("../printer");
const argumentTypes_1 = require("hardhat/internal/core/params/argumentTypes");
const chalk_1 = require("chalk");
(0, config_1.subtask)(task_names_1.SUBTASK_WRITE_DEPLOYMENTS)
    .addParam('outputs', 'Output object from the chain builder', null, argumentTypes_1.any)
    .addOptionalParam('prefix', 'Prefix deployments with a name (default: empty)', '')
    .setAction(({ outputs, prefix }, hre) => __awaiter(void 0, void 0, void 0, function* () {
    const deploymentPath = path_1.default.resolve(hre.config.paths.deployments, hre.network.name);
    yield fs_extra_1.default.mkdirp(deploymentPath);
    console.log((0, chalk_1.green)(`Writing deployment artifacts to ./${path_1.default.relative(process.cwd(), deploymentPath)}\n`));
    yield writeModuleDeployments(deploymentPath, prefix, outputs);
    // neatly print also
    (0, printer_1.printChainBuilderOutput)(outputs);
}));
/**
 * Recursively writes all deployments for a chainbuilder output
 */
function writeModuleDeployments(deploymentPath, prefix, outputs) {
    return __awaiter(this, void 0, void 0, function* () {
        if (prefix) {
            prefix = prefix + '.';
        }
        for (const m in outputs.imports) {
            yield writeModuleDeployments(deploymentPath, `${prefix}${m}`, outputs.imports[m]);
        }
        for (const contract in outputs.contracts) {
            const file = path_1.default.join(deploymentPath, `${prefix}${contract}.json`);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const contractOutputs = outputs.contracts[contract];
            const transformedOutput = Object.assign(Object.assign({}, contractOutputs), { abi: contractOutputs.abi });
            // JSON format is already correct, so we can just output what we have
            yield fs_extra_1.default.writeFile(file, JSON.stringify(transformedOutput, null, 2));
        }
    });
}
