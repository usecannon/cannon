var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import readline from 'node:readline';
export default function onKeypress(handleKeyPress) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            escapeCodeTimeout: 50,
        });
        readline.emitKeypressEvents(process.stdin, rl);
        process.stdin.setRawMode(true);
        process.stdin.resume();
        const listener = (_, key) => {
            handleKeyPress(key, { pause, stop });
        };
        const pause = (fn) => __awaiter(this, void 0, void 0, function* () {
            process.stdin.off('keypress', listener);
            process.stdin.setRawMode(false);
            yield fn();
            process.stdin.on('keypress', listener);
            process.stdin.setRawMode(true);
            process.stdin.resume();
        });
        const stop = () => {
            process.stdin.off('keypress', listener);
            process.stdin.setRawMode(false);
            rl.close();
            resolve(null);
        };
        process.stdin.on('keypress', listener);
    });
}
