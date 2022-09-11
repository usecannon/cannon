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
const child_process_1 = require("child_process");
const prompts_1 = __importDefault(require("prompts"));
function installAnvil() {
    return __awaiter(this, void 0, void 0, function* () {
        // Ensure our version of Anvil is installed
        try {
            yield (0, child_process_1.exec)('anvil --version');
        }
        catch (err) {
            const response = yield (0, prompts_1.default)({
                type: 'confirm',
                name: 'confirmation',
                message: 'Cannon requires the foundry toolchain to be installed. Continue?',
                initial: true,
            });
            if (response.confirmation) {
                yield (0, child_process_1.exec)('curl -L https://foundry.paradigm.xyz | bash');
                yield (0, child_process_1.exec)('foundryup');
            }
            else {
                process.exit();
            }
        }
        return;
    });
}
exports.default = installAnvil;
