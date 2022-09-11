"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.printChainBuilderOutput = void 0;
const lodash_1 = __importDefault(require("lodash"));
const table_1 = require("table");
function printChainBuilderOutput(output) {
    if (output.contracts) {
        const formattedData = lodash_1.default.map(output.contracts, (v, k) => [k, v.address]);
        if (formattedData.length) {
            console.log('CONTRACTS:');
            console.log((0, table_1.table)(formattedData));
        }
    }
    if (output.txns) {
        const formattedData = lodash_1.default.map(output.txns, (v, k) => [k, v.hash]);
        if (formattedData.length) {
            console.log('TRANSACTIONS:');
            console.log((0, table_1.table)(formattedData));
        }
    }
}
exports.printChainBuilderOutput = printChainBuilderOutput;
