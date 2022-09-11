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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function (o, m, k, k2) {
    if (k2 === undefined)
        k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function () { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function (o, m, k, k2) {
    if (k2 === undefined)
        k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function (o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function (o, v) {
    o["default"] = v;
});
var __exportStar = (this && this.__exportStar) || function (m, exports) {
    for (var p in m)
        if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p))
            __createBinding(exports, m, p);
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule)
        return mod;
    var result = {};
    if (mod != null)
        for (var k in mod)
            if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
                __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verify = exports.run = exports.publish = exports.packages = exports.inspect = exports.importPackage = exports.exportPackage = exports.deploy = exports.build = void 0;
const node_path_1 = __importDefault(require("node:path"));
const promises_1 = __importDefault(require("node:fs/promises"));
const ethers_1 = require("ethers");
const commander_1 = require("commander");
const helpers_1 = require("./helpers");
const params_1 = require("./util/params");
const package_json_1 = __importDefault(require("../package.json"));
const constants_1 = require("./constants");
const rpc_1 = require("./rpc");
// Can we avoid doing these exports here so only the necessary files are loaded when running a command?
var build_1 = require("./commands/build");
Object.defineProperty(exports, "build", { enumerable: true, get: function () { return build_1.build; } });
var deploy_1 = require("./commands/deploy");
Object.defineProperty(exports, "deploy", { enumerable: true, get: function () { return deploy_1.deploy; } });
var export_1 = require("./commands/export");
Object.defineProperty(exports, "exportPackage", { enumerable: true, get: function () { return export_1.exportPackage; } });
var import_1 = require("./commands/import");
Object.defineProperty(exports, "importPackage", { enumerable: true, get: function () { return import_1.importPackage; } });
var inspect_1 = require("./commands/inspect");
Object.defineProperty(exports, "inspect", { enumerable: true, get: function () { return inspect_1.inspect; } });
var packages_1 = require("./commands/packages");
Object.defineProperty(exports, "packages", { enumerable: true, get: function () { return packages_1.packages; } });
var publish_1 = require("./commands/publish");
Object.defineProperty(exports, "publish", { enumerable: true, get: function () { return publish_1.publish; } });
var run_1 = require("./commands/run");
Object.defineProperty(exports, "run", { enumerable: true, get: function () { return run_1.run; } });
var verify_1 = require("./commands/verify");
Object.defineProperty(exports, "verify", { enumerable: true, get: function () { return verify_1.verify; } });
__exportStar(require("./types"), exports);
const program = new commander_1.Command();
program
    .name('cannon')
    .version(package_json_1.default.version)
    .description('Run a cannon package on a local node')
    .hook('preAction', function () {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, helpers_1.checkCannonVersion)(package_json_1.default.version);
    });
});
configureRun(program);
configureRun(program.command('run'));
function configureRun(program) {
    return program
        .description('Utility for instantly loading cannon packages in standalone contexts')
        .usage('[global options] ...[<name>[:<semver>] ...[<key>=<value>]]')
        .argument('[packageNames...]', 'List of packages to load, optionally with custom settings for each one', params_1.parsePackagesArguments)
        .option('-p --port <number>', 'Port which the JSON-RPC server will be exposed', '8545')
        .option('-f --fork <url>', 'Fork the network at the specified RPC url')
        .option('--logs', 'Show RPC logs instead of an interactive prompt')
        .option('--preset <name>', 'Load an alternate setting preset', 'main')
        .option('--write-deployments <path>', 'Path to write the deployments data (address and ABIs), like "./deployments"')
        .option('-d --cannon-directory [directory]', 'Path to a custom package directory', constants_1.DEFAULT_CANNON_DIRECTORY)
        .option('--registry-ipfs-url [https://...]', 'URL of the JSON-RPC server used to query the registry', constants_1.DEFAULT_REGISTRY_IPFS_ENDPOINT)
        .option('--registry-rpc-url [https://...]', 'Network endpoint for interacting with the registry', constants_1.DEFAULT_REGISTRY_ENDPOINT)
        .option('--registry-address [0x...]', 'Address of the registry contract', constants_1.DEFAULT_REGISTRY_ADDRESS)
        .option('--impersonate', 'Create impersonated signers instead of using real wallets')
        .option('--fund-addresses <fundAddresses...>', 'Pass a list of addresses to receive a balance of 10,000 ETH')
        .action(function (packages, options, program) {
        return __awaiter(this, void 0, void 0, function* () {
            const { run } = yield Promise.resolve().then(() => __importStar(require('./commands/run')));
            yield run(packages, Object.assign(Object.assign({}, options), { helpInformation: program.helpInformation() }));
        });
    });
}
program
    .command('build')
    .description('Build a package from a Cannonfile')
    .argument('[cannonfile]', 'Path to a cannonfile', 'cannonfile.toml')
    .argument('[settings...]', 'Custom settings for building the cannonfile')
    .option('-p --preset <preset>', 'The preset label for storing the build with the given settings', 'main')
    .option('-c --contracts-directory [contracts]', 'Contracts source directory which will be built using Foundry and saved to the path specified with --artifacts', './src')
    .option('-a --artifacts-directory [artifacts]', 'Path to a directory with your artifact data', './out')
    .option('-d --cannon-directory [directory]', 'Path to a custom package directory', constants_1.DEFAULT_CANNON_DIRECTORY)
    .option('--registry-ipfs-url [https://...]', 'URL of the JSON-RPC server used to query the registry', constants_1.DEFAULT_REGISTRY_IPFS_ENDPOINT)
    .option('--registry-rpc-url [https://...]', 'Network endpoint for interacting with the registry', constants_1.DEFAULT_REGISTRY_ENDPOINT)
    .option('--registry-address [0x...]', 'Address of the registry contract', constants_1.DEFAULT_REGISTRY_ADDRESS)
    .showHelpAfterError('Use --help for more information.')
    .action(function (cannonfile, settings, opts) {
    return __awaiter(this, void 0, void 0, function* () {
        // If the first param is not a cannonfile, it should be parsed as settings
        if (!cannonfile.endsWith('.toml')) {
            settings.unshift(cannonfile);
            cannonfile = 'cannonfile.toml';
        }
        const parsedSettings = (0, params_1.parseSettings)(settings);
        const cannonfilePath = node_path_1.default.resolve(cannonfile);
        const projectDirectory = node_path_1.default.dirname(cannonfilePath);
        yield (0, helpers_1.setupAnvil)();
        // Build project to get the artifacts
        const contractsPath = opts.contracts ? node_path_1.default.resolve(opts.contracts) : node_path_1.default.join(projectDirectory, 'src');
        const artifactsPath = opts.artifacts ? node_path_1.default.resolve(opts.artifacts) : node_path_1.default.join(projectDirectory, 'out');
        yield (0, helpers_1.execPromise)(`forge build -c ${contractsPath} -o ${artifactsPath}`);
        const getArtifact = (name) => __awaiter(this, void 0, void 0, function* () {
            // TODO: Theres a bug that if the file has a different name than the contract it would not work
            const artifactPath = node_path_1.default.join(artifactsPath, `${name}.sol`, `${name}.json`);
            const artifactBuffer = yield promises_1.default.readFile(artifactPath);
            const artifact = JSON.parse(artifactBuffer.toString());
            return {
                contractName: name,
                sourceName: artifact.ast.absolutePath,
                abi: artifact.abi,
                bytecode: artifact.bytecode.object,
                linkReferences: artifact.bytecode.linkReferences,
            };
        });
        const { build } = yield Promise.resolve().then(() => __importStar(require('./commands/build')));
        yield build({
            cannonfilePath,
            settings: parsedSettings,
            getArtifact,
            cannonDirectory: opts.cannonDirectory,
            projectDirectory,
            preset: opts.preset,
            registryIpfsUrl: opts.registryIpfsUrl,
            registryRpcUrl: opts.registryRpcUrl,
            registryAddress: opts.registryAddress,
        });
    });
});
program
    .command('deploy')
    .description('Deploy a cannon package to a network')
    .argument('[packageWithSettings...]', 'Package to deploy, optionally with custom settings', params_1.parsePackageArguments)
    .requiredOption('-n --network-rpc <networkRpc>', 'URL of a JSON-RPC server to use for deployment')
    .requiredOption('-p --private-key <privateKey>', 'Private key of the wallet to use for deployment')
    .option('-p --preset [preset]', 'Load an alternate setting preset', 'main')
    .option('-d --cannon-directory [directory]', 'Path to a custom package directory', constants_1.DEFAULT_CANNON_DIRECTORY)
    .option('--write-deployments <path>', 'Path to write the deployments data (address and ABIs), like "./deployments"')
    .option('--prefix [prefix]', 'Specify a prefix to apply to the deployment artifact outputs')
    .option('--dry-run', 'Simulate this deployment process without deploying the contracts to the specified network')
    .option('--registry-ipfs-url [https://...]', 'URL of the JSON-RPC server used to query the registry', constants_1.DEFAULT_REGISTRY_IPFS_ENDPOINT)
    .option('--registry-rpc-url [https://...]', 'Network endpoint for interacting with the registry', constants_1.DEFAULT_REGISTRY_ENDPOINT)
    .option('--registry-address [0x...]', 'Address of the registry contract', constants_1.DEFAULT_REGISTRY_ADDRESS)
    .action(function (packageDefinition, opts) {
    return __awaiter(this, void 0, void 0, function* () {
        const { deploy } = yield Promise.resolve().then(() => __importStar(require('./commands/deploy')));
        const projectDirectory = process.cwd();
        const deploymentPath = opts.writeDeployments
            ? node_path_1.default.resolve(opts.writeDeployments)
            : node_path_1.default.resolve(projectDirectory, 'deployments');
        let provider = new ethers_1.ethers.providers.JsonRpcProvider(opts.networkRpc);
        if (opts.dryRun) {
            const anvilInstance = yield (0, rpc_1.runRpc)({
                forkUrl: opts.networkRpc,
                port: 8545,
                chainId: (yield provider.getNetwork()).chainId,
            });
            provider = yield (0, rpc_1.getProvider)(anvilInstance);
        }
        const signer = new ethers_1.ethers.Wallet(opts.privateKey, provider);
        yield deploy({
            packageDefinition,
            cannonDirectory: opts.directory,
            projectDirectory,
            provider,
            signer,
            preset: opts.preset,
            dryRun: opts.dryRun || false,
            prefix: opts.prefix,
            deploymentPath,
            registryIpfsUrl: opts.registryIpfsUrl,
            registryRpcUrl: opts.registryRpcUrl,
            registryAddress: opts.registryAddress,
        });
    });
});
program
    .command('verify')
    .description('Verify a package on Etherscan')
    .argument('<packageName>', 'Name and version of the Cannon package to verify')
    .option('-a --apiKey <apiKey>', 'Etherscan API key')
    .option('-n --network <network>', 'Network of deployment to verify', 'mainnet')
    .option('-d --directory [directory]', 'Path to a custom package directory', constants_1.DEFAULT_CANNON_DIRECTORY)
    .action(function (packageName, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const { verify } = yield Promise.resolve().then(() => __importStar(require('./commands/verify')));
        yield verify(packageName, options.apiKey, options.network, options.directory);
    });
});
program
    .command('packages')
    .description('List all packages in the local Cannon directory')
    .argument('[directory]', 'Path to a custom package directory', constants_1.DEFAULT_CANNON_DIRECTORY)
    .action(function (directory) {
    return __awaiter(this, void 0, void 0, function* () {
        const { packages } = yield Promise.resolve().then(() => __importStar(require('./commands/packages')));
        yield packages(directory);
    });
});
program
    .command('inspect')
    .description('Inspect the details of a Cannon package')
    .argument('<packageName>', 'Name and version of the cannon package to inspect')
    .option('-d --directory [directory]', 'Path to a custom package directory', constants_1.DEFAULT_CANNON_DIRECTORY)
    .option('-j --json', 'Output as JSON')
    .action(function (packageName, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const { inspect } = yield Promise.resolve().then(() => __importStar(require('./commands/inspect')));
        yield inspect(options.directory, packageName, options.json);
    });
});
program
    .command('publish')
    .description('Publish a Cannon package to the registry')
    .argument('<packageName>', 'Name and version of the package to publish')
    .option('-p <privateKey>', 'Private key of the wallet to use when publishing')
    .option('-d --directory [directory]', 'Path to a custom package directory', constants_1.DEFAULT_CANNON_DIRECTORY)
    .option('-t --tags <tags>', 'Comma separated list of labels for your package', 'latest')
    .option('-a --registryAddress <registryAddress>', 'Address for a custom package registry', constants_1.DEFAULT_REGISTRY_ADDRESS)
    .option('-r --registryEndpoint <registryEndpoint>', 'Address for RPC endpoint for the registry', constants_1.DEFAULT_REGISTRY_ENDPOINT)
    .option('-e --ipfsEndpoint <ipfsEndpoint>', 'Address for an IPFS endpoint')
    .option('-h --ipfsAuthorizationHeader <ipfsAuthorizationHeader>', 'Authorization header for requests to the IPFS endpoint')
    .action(function (packageName, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const { publish } = yield Promise.resolve().then(() => __importStar(require('./commands/publish')));
        yield publish(options.directory, options.privateKey, packageName, options.tags, options.registryAddress, options.registryEndpoint, options.ipfsEndpoint, options.ipfsAuthorizationHeader);
    });
});
program
    .command('import')
    .description('Import a Cannon package from a zip archive')
    .argument('<importFile>', 'Relative path and filename to package archive')
    .option('-d --directory [directory]', 'Path to a custom package directory', constants_1.DEFAULT_CANNON_DIRECTORY)
    .action(function (importFile, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const { importPackage } = yield Promise.resolve().then(() => __importStar(require('./commands/import')));
        yield importPackage(options.directory, importFile);
    });
});
program
    .command('export')
    .description('Export a Cannon package as a zip archive')
    .argument('<packageName>', 'Name and version of the cannon package to export')
    .argument('[outputFile]', 'Relative path and filename to export package archive')
    .option('-d --directory [directory]', 'Path to a custom package directory', constants_1.DEFAULT_CANNON_DIRECTORY)
    .action(function (packageName, outputFile, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const { exportPackage } = yield Promise.resolve().then(() => __importStar(require('./commands/export')));
        yield exportPackage(options.directory, outputFile, packageName);
    });
});
exports.default = program;
