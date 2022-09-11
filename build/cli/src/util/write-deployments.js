var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import fs from 'node:fs/promises';
import path from 'path';
/**
 * Recursively writes all deployments for a chainbuilder output
 */
export function writeModuleDeployments(deploymentPath, prefix, outputs) {
    return __awaiter(this, void 0, void 0, function* () {
        yield fs.mkdir(deploymentPath, { recursive: true });
        if (prefix) {
            prefix += '.';
        }
        for (const m in outputs.imports) {
            yield writeModuleDeployments(deploymentPath, `${prefix}${m}`, outputs.imports[m]);
        }
        for (const contract in outputs.contracts) {
            const file = path.join(deploymentPath, `${prefix}${contract}.json`);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const contractOutputs = outputs.contracts[contract];
            const transformedOutput = Object.assign(Object.assign({}, contractOutputs), { abi: contractOutputs.abi });
            // JSON format is already correct, so we can just output what we have
            yield fs.writeFile(file, JSON.stringify(transformedOutput, null, 2));
        }
    });
}
