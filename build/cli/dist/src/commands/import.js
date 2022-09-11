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
exports.importPackage = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const builder_1 = require("@usecannon/builder");
const chalk_1 = require("chalk");
const untildify_1 = __importDefault(require("untildify"));
function importPackage(cannonDirectory, importFile) {
    return __awaiter(this, void 0, void 0, function* () {
        cannonDirectory = (0, untildify_1.default)(cannonDirectory);
        importFile = (0, untildify_1.default)(importFile);
        const info = yield (0, builder_1.importChain)(cannonDirectory, yield fs_extra_1.default.readFile(importFile));
        console.log((0, chalk_1.greenBright)(`Imported ${info.name}:${info.version} from ${importFile} to ${cannonDirectory}`));
    });
}
exports.importPackage = importPackage;
