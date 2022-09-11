var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import fs from 'fs-extra';
import { exportChain } from '@usecannon/builder';
import { greenBright } from 'chalk';
import prompts from 'prompts';
import untildify from 'untildify';
export function exportPackage(cannonDirectory, exportFile, packageRef) {
    return __awaiter(this, void 0, void 0, function* () {
        const packageName = packageRef.split(':')[0];
        const packageVersion = packageRef.includes(':') ? packageRef.split(':')[1] : 'latest';
        cannonDirectory = untildify(cannonDirectory);
        if (!exportFile) {
            exportFile = `${packageName}.${packageVersion}`;
        }
        if (!exportFile.endsWith('.zip')) {
            exportFile += '.zip';
        }
        const resolvedFilepath = untildify(exportFile);
        if (fs.existsSync(resolvedFilepath)) {
            const confirmationResponse = yield prompts({
                type: 'confirm',
                name: 'confirmation',
                message: `A file already exists at ${resolvedFilepath} Overwrite it?`,
                initial: false,
            });
            if (!confirmationResponse.confirmation) {
                process.exit();
            }
        }
        const buf = yield exportChain(cannonDirectory, packageName, packageVersion);
        yield fs.writeFile(resolvedFilepath, buf);
        console.log(greenBright(`Exported ${packageName}:${packageVersion} to ${resolvedFilepath}`));
    });
}
