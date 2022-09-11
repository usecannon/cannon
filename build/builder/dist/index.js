'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __createBinding = (this && this.__createBinding) ||
    (Object.create
        ? function (o, m, k, k2) {
            if (k2 === undefined)
                k2 = k;
            var desc = Object.getOwnPropertyDescriptor(m, k);
            if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
                desc = {
                    enumerable: true,
                    get: function () {
                        return m[k];
                    },
                };
            }
            Object.defineProperty(o, k2, desc);
        }
        : function (o, m, k, k2) {
            if (k2 === undefined)
                k2 = k;
            o[k2] = m[k];
        });
var __exportStar = (this && this.__exportStar) ||
    function (m, exports) {
        for (var p in m)
            if (p !== 'default' && !Object.prototype.hasOwnProperty.call(exports, p))
                __createBinding(exports, m, p);
    };
var __importDefault = (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, '__esModule', { value: true });
exports.downloadPackagesRecursive =
    exports.CannonRegistry =
        exports.validateChainDefinition =
            exports.Events =
                exports.ChainBuilder =
                    void 0;
const path_1 = __importDefault(require('path'));
const fs_extra_1 = require('fs-extra');
const builder_1 = require('./builder');
const storage_1 = require('./storage');
var builder_2 = require('./builder');
Object.defineProperty(exports, 'ChainBuilder', {
    enumerable: true,
    get: function () {
        return builder_2.ChainBuilder;
    },
});
Object.defineProperty(exports, 'Events', {
    enumerable: true,
    get: function () {
        return builder_2.Events;
    },
});
var types_1 = require('./types');
Object.defineProperty(exports, 'validateChainDefinition', {
    enumerable: true,
    get: function () {
        return types_1.validateChainDefinition;
    },
});
__exportStar(require('./storage'), exports);
var registry_1 = require('./registry');
Object.defineProperty(exports, 'CannonRegistry', {
    enumerable: true,
    get: function () {
        return registry_1.CannonRegistry;
    },
});
function downloadPackagesRecursive(pkg, chainId, preset, registry, provider, chartsDir) {
    return __awaiter(this, void 0, void 0, function* () {
        chartsDir = chartsDir || (0, storage_1.getSavedChartsDir)();
        const [name, tag] = pkg.split(':');
        const depdir = path_1.default.dirname((0, storage_1.getActionFiles)((0, storage_1.getChartDir)(chartsDir, name, tag), chainId, preset || 'main', 'sample')
            .basename);
        if (!(0, fs_extra_1.existsSync)(depdir)) {
            yield registry.downloadPackageChain(pkg, chainId, preset || 'main', chartsDir);
            const builder = new builder_1.ChainBuilder({
                name,
                version: tag,
                writeMode: 'none',
                readMode: 'none',
                provider,
                getSigner: () => __awaiter(this, void 0, void 0, function* () {
                    throw new Error('signer should be unused');
                }),
                chainId: chainId,
                savedChartsDir: chartsDir,
            });
            const dependencies = yield builder.getDependencies({});
            for (const dependency of dependencies) {
                yield downloadPackagesRecursive(dependency.source, dependency.chainId, dependency.preset, registry, provider, chartsDir);
            }
        }
    });
}
exports.downloadPackagesRecursive = downloadPackagesRecursive;
