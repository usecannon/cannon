var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from 'hardhat';
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        // Hardhat always runs the compile task when running scripts with its command
        // line interface.
        //
        // If this script is run directly using `node` you may want to call compile
        // manually to make sure everything is compiled
        // await hre.run('compile');
        // We get the contract to deploy
        const Greeter = yield ethers.getContractFactory('Greeter');
        const greeter = yield Greeter.deploy('Hello, Hardhat!');
        yield greeter.deployed();
        console.log('Greeter deployed to:', greeter.address);
    });
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
