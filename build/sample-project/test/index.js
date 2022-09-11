var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { ethers } from 'hardhat';
import { expect } from 'chai';
describe('Greeter', function () {
    it('Should return the new greeting once it is changed', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const Greeter = yield ethers.getContractFactory('Greeter');
            const greeter = yield Greeter.deploy('Hello, world!');
            yield greeter.deployed();
            expect(yield greeter.greet()).to.equal('Hello, world!');
            const setGreetingTx = yield greeter.setGreeting('Hola, mundo!');
            // wait until the transaction is mined
            yield setGreetingTx.wait();
            expect(yield greeter.greet()).to.equal('Hola, mundo!');
        });
    });
});
