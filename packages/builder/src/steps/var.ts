import Debug from 'debug';
import _ from 'lodash';
import { z } from 'zod';
import * as viem from 'viem';
import { mergeTemplateAccesses } from '../access-recorder';
import { varSchema } from '../schemas';
import { template } from '../utils/template';
import { CannonAction } from '../actions';

const debug = Debug('cannon:builder:var');

/**
 *  Available properties for var operation (legacy format)
 *  @public
 *  @group Var
 */
export type Config = z.infer<typeof varSchema>;

/**
 *  New var definition format with type, value, description
 *  @public
 *  @group Var
 */
export type VarDefinition = {
  value?: string;
  type: 'string' | 'address' | 'number' | 'boolean' | 'bytes';
  description?: string;
};

/**
 *  Var namespace format (e.g., [var.main])
 *  @public
 *  @group Var
 */
export type VarNamespaceConfig = Record<string, VarDefinition>;

export interface Outputs {
  [key: string]: string;
}

/**
 * Validate a value against its declared type
 */
function validateType(value: string, type: VarDefinition['type']): boolean {
  switch (type) {
    case 'address':
      return viem.isAddress(value);
    case 'number':
      return !isNaN(Number(value));
    case 'boolean':
      return value === 'true' || value === 'false';
    case 'bytes':
      return viem.isHex(value);
    case 'string':
    default:
      return true;
  }
}

/**
 * Check if a value looks like a VarDefinition object
 */
function isVarDefinition(val: unknown): val is VarDefinition {
  return (
    _.isPlainObject(val) &&
    typeof (val as any).type === 'string' &&
    ['string', 'address', 'number', 'boolean', 'bytes'].includes((val as any).type)
  );
}

/**
 * Check if config is in the new var namespace format
 * Keys that are not 'depends' and have VarDefinition values indicate new format
 */
function isVarNamespaceConfig(config: Record<string, any>): config is VarNamespaceConfig {
  // Check if any key (except 'depends') has a VarDefinition object
  for (const [key, val] of Object.entries(config)) {
    if (key !== 'depends' && isVarDefinition(val)) {
      return true;
    }
  }
  return false;
}

// ensure the specified contract is already deployed
// if not deployed, deploy the specified hardhat contract with specfied options, export address, abi, etc.
// if already deployed, reexport deployment options for usage downstream and exit with no changes
const varSpec = {
  label: 'var',

  validate: varSchema,

  async getState(runtime, ctx, config, packageState) {
    const cfg = this.configInject(ctx, config, packageState);

    return [_.omit(cfg, 'depends')];
  },

  configInject(ctx, config) {
    config = _.cloneDeep(config);
    
    // Check if this is the new var namespace format
    if (isVarNamespaceConfig(config)) {
      // New format: inject values in var definitions
      for (const [varName, varDef] of Object.entries(config)) {
        if (isVarDefinition(varDef) && varDef.value !== undefined) {
          varDef.value = template(varDef.value, ctx);
        }
        // Type and description are not templated
      }
    } else {
      // Legacy format: inject all string values (skip 'depends' array)
      for (const c in _.omit(config, 'depends')) {
        if (typeof config[c] === 'string') {
          config[c] = template(config[c], ctx);
        }
      }
    }

    return config;
  },

  getInputs(config, engine) {
    let accesses = engine.computeTemplateAccesses('');

    // Check if this is the new var namespace format
    if (isVarNamespaceConfig(config)) {
      for (const [varName, varDef] of Object.entries(config)) {
        if (isVarDefinition(varDef) && varDef.value !== undefined) {
          const fields = engine.computeTemplateAccesses(varDef.value);
          accesses = mergeTemplateAccesses(accesses, fields);
        }
      }
    } else {
      // Legacy format
      for (const c in _.omit(config, 'depends')) {
        if (typeof config[c] === 'string') {
          const fields = engine.computeTemplateAccesses(config[c]);
          accesses = mergeTemplateAccesses(accesses, fields);
        }
      }
    }

    return accesses;
  },

  getOutputs(config, packageState) {
    // Backwards compatibility for old setting format
    if (packageState.currentLabel.startsWith('setting.')) {
      return [`settings.${packageState.currentLabel.split('.')[1]}`];
    }

    const namespace = packageState.currentLabel.split('.')[1];
    
    // Check if this is the new var namespace format
    if (isVarNamespaceConfig(config)) {
      // New format: outputs are var.namespace.varname
      return Object.keys(config)
        .filter((k) => k !== 'depends')
        .map((k) => `var.${namespace}.${k}`);
    }
    
    // Legacy format: outputs are settings.varname
    return Object.keys(config)
      .filter((k) => k !== 'depends')
      .map((k) => `settings.${k}`);
  },

  async exec(runtime, ctx, config, packageState) {
    const varLabel = packageState.currentLabel?.split('.')[1] || '';
    debug('exec', config, ctx);

    // Backwards compatibility for old setting format
    if (packageState.currentLabel.startsWith('setting.')) {
      const stepName = packageState.currentLabel.split('.')[1];
      let value = (config as any).value || (config as any).defaultValue || ctx.overrideSettings[stepName];

      if (!value) {
        value = '';
      }

      return {
        settings: {
          [varLabel]: value,
        },
      };
    }

    const namespace = varLabel;

    // Check if this is the new var namespace format
    if (isVarNamespaceConfig(config)) {
      const settings: { [k: string]: string } = {};
      const vars: { [namespace: string]: { [k: string]: string } } = {};

      for (const [varName, varDef] of Object.entries(config)) {
        if (!isVarDefinition(varDef)) continue;

        // Get value from config, override settings, or error
        let value = varDef.value;
        const overrideKey = `${namespace}.${varName}`;
        
        if (ctx.overrideSettings[overrideKey] !== undefined) {
          value = ctx.overrideSettings[overrideKey];
        }

        if (value === undefined) {
          throw new Error(
            `Variable "${varName}" in namespace "${namespace}" has no value defined and no external override was provided. ` +
            `Either set \`value\` in the cannonfile or provide --var ${overrideKey}=<value>`
          );
        }

        // Validate type
        if (!validateType(value, varDef.type)) {
          throw new Error(
            `Variable "${varName}" in namespace "${namespace}" has invalid value "${value}" for type "${varDef.type}"`
          );
        }

        settings[varName] = value;
      }

      // Return both settings (for backwards compat) and namespaced vars
      return { 
        settings,
        vars: { [namespace]: settings }
      };
    }

    // Legacy format: flat key-value pairs
    const settings: { [k: string]: string } = {};

    for (const c in _.omit(config, 'depends')) {
      if (typeof config[c] === 'string') {
        settings[c] = config[c];
      }
    }

    return { settings };
  },
} satisfies CannonAction<Config>;

export default varSpec;
