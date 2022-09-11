'use strict';
var __importDefault = (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, '__esModule', { value: true });
exports.validateChainDefinition = void 0;
const jtd_1 = __importDefault(require('ajv/dist/jtd'));
const contract_1 = __importDefault(require('./steps/contract'));
const import_1 = __importDefault(require('./steps/import'));
const invoke_1 = __importDefault(require('./steps/invoke'));
const keeper_1 = __importDefault(require('./steps/keeper'));
const run_1 = __importDefault(require('./steps/run'));
const ajv = new jtd_1.default();
const ChainDefinitionSchema = {
    properties: {
        name: { type: 'string' },
        version: { type: 'string' },
    },
    optionalProperties: {
        description: { type: 'string' },
        keywords: { elements: { type: 'string' } },
        setting: {
            values: {
                optionalProperties: {
                    description: { type: 'string' },
                    type: { enum: ['number', 'string', 'boolean'] },
                    defaultValue: {},
                },
            },
        },
        import: { values: import_1.default.validate },
        contract: { values: contract_1.default.validate },
        invoke: { values: invoke_1.default.validate },
        run: { values: run_1.default.validate },
        keeper: { values: keeper_1.default.validate },
    },
};
exports.validateChainDefinition = ajv.compile(ChainDefinitionSchema);
