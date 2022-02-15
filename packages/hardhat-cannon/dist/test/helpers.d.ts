import { HardhatRuntimeEnvironment } from 'hardhat/types';
declare module 'mocha' {
    interface Context {
        hre: HardhatRuntimeEnvironment;
    }
}
export declare function useEnvironment(fixtureProjectName: string): void;
//# sourceMappingURL=helpers.d.ts.map