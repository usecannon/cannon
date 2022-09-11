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
exports.writeModuleDeployments = void 0;
const promises_1 = __importDefault(require("node:fs/promises"));
const path_1 = __importDefault(require("path"));
/**
 * Recursively writes all deployments for a chainbuilder output
 */
function writeModuleDeployments(deploymentPath, prefix, outputs) {
    return __awaiter(this, void 0, void 0, function* () {
        yield promises_1.default.mkdir(deploymentPath, { recursive: true });
        if (prefix) {
            prefix += '.';
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
            yield promises_1.default.writeFile(file, JSON.stringify(transformedOutput, null, 2));
        }
    });
}
exports.writeModuleDeployments = writeModuleDeployments;
