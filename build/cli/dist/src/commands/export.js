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
exports.exportPackage = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const builder_1 = require("@usecannon/builder");
const chalk_1 = require("chalk");
const prompts_1 = __importDefault(require("prompts"));
const untildify_1 = __importDefault(require("untildify"));
function exportPackage(cannonDirectory, exportFile, packageRef) {
    return __awaiter(this, void 0, void 0, function* () {
        const packageName = packageRef.split(':')[0];
        const packageVersion = packageRef.includes(':') ? packageRef.split(':')[1] : 'latest';
        cannonDirectory = (0, untildify_1.default)(cannonDirectory);
        if (!exportFile) {
            exportFile = `${packageName}.${packageVersion}`;
        }
        if (!exportFile.endsWith('.zip')) {
            exportFile += '.zip';
        }
        const resolvedFilepath = (0, untildify_1.default)(exportFile);
        if (fs_extra_1.default.existsSync(resolvedFilepath)) {
            const confirmationResponse = yield (0, prompts_1.default)({
                type: 'confirm',
                name: 'confirmation',
                message: `A file already exists at ${resolvedFilepath} Overwrite it?`,
                initial: false,
            });
            if (!confirmationResponse.confirmation) {
                process.exit();
            }
        }
        const buf = yield (0, builder_1.exportChain)(cannonDirectory, packageName, packageVersion);
        yield fs_extra_1.default.writeFile(resolvedFilepath, buf);
        console.log((0, chalk_1.greenBright)(`Exported ${packageName}:${packageVersion} to ${resolvedFilepath}`));
    });
}
exports.exportPackage = exportPackage;
