var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import hre, { ethers } from 'hardhat';
function doTest() {
    return __awaiter(this, void 0, void 0, function* () {
        const rawResult = yield hre.run('cannon:build');
        const { provider, signers, outputs } = rawResult;
        const signer1 = signers[0];
        const contract = new ethers.Contract(outputs.contracts.greeter.address, outputs.contracts.greeter.abi, provider.getSigner(signer1.address));
        try {
            yield contract.doCloning();
        }
        catch (err) {
            console.error('got error:', yield err);
        }
    });
}
doTest();
