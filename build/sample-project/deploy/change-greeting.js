var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import hre from 'hardhat';
// first arg is chainbuilder runtime, which is here unused
export function exec(_, address, msg) {
    return __awaiter(this, void 0, void 0, function* () {
        const contract = yield hre.ethers.getContractAt('Greeter', address);
        const txn = yield contract.setGreeting(msg);
        const receipt = yield txn.wait();
        return { hash: receipt.transactionHash };
    });
}
