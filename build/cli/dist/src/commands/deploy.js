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
exports.deploy = void 0;
const node_path_1 = __importDefault(require("node:path"));
const builder_1 = require("@usecannon/builder");
const chalk_1 = require("chalk");
const helpers_1 = require("../helpers");
const printer_1 = require("../util/printer");
const write_deployments_1 = require("../util/write-deployments");
const registry_1 = __importDefault(require("../registry"));
function deploy({ packageDefinition, cannonDirectory, projectDirectory, signer, provider, preset, dryRun, deploymentPath, prefix = '', registryAddress, registryRpcUrl, registryIpfsUrl, }) {
    return __awaiter(this, void 0, void 0, function* () {
        const { def } = (0, helpers_1.findPackage)(cannonDirectory, packageDefinition.name, packageDefinition.version);
        const { chainId } = yield provider.getNetwork();
        const signerAddress = yield signer.getAddress();
        const getSigner = (addr) => {
            if (addr !== signerAddress) {
                throw new Error(`Looking for a signer different that the one configured: ${addr}`);
            }
            return Promise.resolve(signer);
        };
        const builder = new builder_1.ChainBuilder({
            name: packageDefinition.name,
            version: packageDefinition.version,
            def,
            preset,
            readMode: 'metadata',
            writeMode: dryRun ? 'none' : 'metadata',
            provider,
            chainId,
            baseDir: projectDirectory,
            savedPackagesDir: cannonDirectory,
            getSigner,
            getDefaultSigner: () => Promise.resolve(signer),
        });
        const registry = (0, registry_1.default)({
            registryAddress: registryAddress,
            registryRpc: registryRpcUrl,
            ipfsUrl: registryIpfsUrl,
        });
        const dependencies = yield builder.def.getRequiredImports(yield builder.populateSettings(packageDefinition.settings));
        for (const dependency of dependencies) {
            console.log(`Loading dependency tree ${dependency.source} (${dependency.chainId}-${dependency.preset})`);
            yield (0, builder_1.downloadPackagesRecursive)(dependency.source, dependency.chainId, dependency.preset, registry, builder.provider, builder.packagesDir);
        }
        builder.on(builder_1.Events.PreStepExecute, (t, n) => console.log(`\nexec: ${t}.${n}`));
        builder.on(builder_1.Events.DeployContract, (n, c) => console.log(`deployed contract ${n} (${c.address})`));
        builder.on(builder_1.Events.DeployTxn, (n, t) => console.log(`ran txn ${n} (${t.hash})`));
        const outputs = yield builder.build(packageDefinition.settings);
        if (deploymentPath) {
            let relativePath = node_path_1.default.relative(process.cwd(), deploymentPath);
            if (!relativePath.startsWith('/')) {
                relativePath = './' + relativePath;
            }
            console.log((0, chalk_1.green)(`Writing deployment artifacts to ${relativePath}\n`));
            yield (0, write_deployments_1.writeModuleDeployments)(deploymentPath, prefix, outputs);
        }
        (0, printer_1.printChainBuilderOutput)(outputs);
        return { outputs };
    });
}
exports.deploy = deploy;
