import 'ses';
import _ from 'lodash';
import Debug from 'debug';
import Fuse from 'fuse.js';
import rfdc from 'rfdc';
import * as acorn from 'acorn';
import { Node, Identifier, MemberExpression } from 'acorn';
import { CannonHelperContext } from '../types';
import { getGlobalVars } from './get-global-vars';

const deepClone = rfdc();
const debug = Debug('cannon:builder:template');

const ALLOWED_IDENTIFIERS = new Set(Object.keys(CannonHelperContext));

const DISALLOWED_IDENTIFIERS = new Set([
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
  '__proto__',
  'arguments',
  'async',
  'await',
  'break',
  'callee',
  'caller',
  'case',
  'catch',
  'class',
  'const',
  'constructor',
  'continue',
  'debugger',
  'delete',
  'do',
  'else',
  'export',
  'extends',
  'finally',
  'for',
  'function',
  'function*',
  'global',
  'globalThis',
  'if',
  'import',
  'let',
  'new',
  'prototype',
  'require',
  'return',
  'self',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'try',
  'var',
  'while',
  'window',
  'with',
  'yield',
]);

const GLOBAL_VARS = new Set(Array.from(getGlobalVars()).filter((g) => !DISALLOWED_IDENTIFIERS.has(g)));

/**
 * Check if the given string is a template string.
 * @param str - The string to check
 * @returns True if the string is a template string, false otherwise
 */
export function isTemplateString(str: string) {
  return /<%[=-]([\s\S]+?)%>/.test(str);
}

/**
 * Find all the matches on the given string for a template string.
 * e.g.:
 *   getTemplateMatches('<%= some.val %>-<%- another.val %>') // ['<%= some.val %>', '<%- another.val %>']
 */
export function getTemplateMatches(str: string, includeTags = true) {
  const results = Array.from(str.matchAll(/<%[=-]([\s\S]+?)%>/g));
  return results.map((r) => (includeTags ? r[0] : r[1].trim()));
}

/**
 * Lodash template function wrapper.
 * It adds a fuzzy search for the keys in the data object in case the user made a typo.
 */
export function renderTemplate(templateStr: string, templateContext: any = {}, safeContext = false) {
  if (!_.isPlainObject(templateContext)) {
    throw new Error('Missing template context');
  }

  // Check that the given context does not contain any disallowed variables
  for (const key of DISALLOWED_IDENTIFIERS) {
    if (Object.prototype.hasOwnProperty.call(templateContext, key)) {
      throw new Error(`Usage of identifier "${key}" is not allowed`);
    }
  }

  try {
    // If it is rendering a real context, we clone it and freeze it to avoid any modifications
    // by the user. This is to avoid any security risks that could be moved to the following steps.
    // E.g.:
    //   args = ["<%= Object.assign(contracts.Greeter, { address: '0xdeadbeef' }) %>"]
    const ctx = safeContext ? templateContext : deepClone(templateContext);

    // Set null to all global vars so they cannot be accessed by the user
    if (!safeContext) {
      for (const key of GLOBAL_VARS.values()) {
        if (ALLOWED_IDENTIFIERS.has(key)) continue;
        if (!Object.prototype.hasOwnProperty.call(templateContext, key)) {
          templateContext[key] = null;
        }
      }
    }

    // Validate the template string to make sure it's safe to execute
    validateTemplate(templateStr, Object.keys(ctx));

    return _.template(templateStr, { imports: CannonHelperContext })(ctx);
  } catch (err) {
    if (err instanceof Error) {
      err.message += ` at ${templateStr}`;

      // Do a fuzzy search in the given context, in the case the user did a typo
      // we look for something close in the current data context object.
      if (templateContext) {
        const match = err.message.includes('Cannot read properties of undefined')
          ? err.message.match(/\(reading '([^']+)'\)/)
          : err.message.includes(' is not defined ')
          ? err.message.match(/([^']+) is not defined at /)
          : null;

        if (match?.[1]) {
          const desiredKey = match[1];
          const allKeys = Array.from(_getAllKeys(templateContext));
          const results = _fuzzySearch(allKeys, desiredKey);
          if (results.length) {
            err.message += "\n\n Here's a list of some fields available in this context, did you mean one of these?";
            for (const res of results) err.message += `\n    ${res}`;
            err.message += '\n';
          }
        }
      }
    }

    throw err;
  }
}

/**
 * Executes a template string in a SES secure compartment.
 * @param templateStr - The template string to evaluate
 * @param context - The template context object, includes the variables to be used in the template
 * @returns The evaluated result
 */
export function template(templateStr: string, templateContext: Record<string, any> = {}, safeContext = false) {
  const code = 'renderTemplate(templateStr, templateContext, safeContext)';

  const compartmentContext = {
    globals: {
      templateStr,
      templateContext,
      renderTemplate,
      safeContext,
    },
    __options__: true,
  };

  try {
    // eslint-disable-next-line no-undef
    const compartment = new Compartment(compartmentContext);
    return compartment.evaluate(code);
  } catch (err) {
    debug(`Render template "${templateStr}" failed:`, err);
    throw err;
  }
}

/**
 * Get all the keys in the given object.
 * @param obj - The object to get the keys from
 * @param parentKey - The parent key
 * @param keys - The set of keys to add to
 * @returns Set of keys
 */
function _getAllKeys(obj: { [key: string]: any }, parentKey = '', keys: Set<string> = new Set()) {
  for (const key of Object.keys(obj)) {
    const fullKey = parentKey ? `${parentKey}.${key}` : key;
    keys.add(fullKey);
    if (_.isPlainObject(obj[key])) _getAllKeys(obj[key], fullKey, keys);
  }

  return keys;
}

/**
 * Perform a fuzzy search on the given data array.
 * @param data - The data array to search
 * @param query - The query string to search for
 * @returns Array of matching items
 */
function _fuzzySearch(data: string[], query: string) {
  const searcher = new Fuse<string>(data, {
    ignoreLocation: true,
    threshold: 0.4,
  });

  return searcher.search(query).map(({ item }) => item);
}

export class TemplateValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TemplateValidationError';
  }
}

const NEW_LINE_CHARS = ['\n', '\r', '\u2028'];

// Define the subset of JS operations that are allowed in templates
const ALLOWED_NODE_TYPES = new Set<acorn.Node['type']>([
  'Program', // Root node of the ast
  'ExpressionStatement', // Represents a single expression
  'Literal', // Represents literal values (numbers, strings, booleans, etc.)
  'BinaryExpression', // Mathematical or comparison operations (e.g., +, -, *, /, >, <)
  'LogicalExpression', // Logical operations (&&, ||)
  'SequenceExpression', // Execution expressions with comma: a, b
  'ConditionalExpression', // Ternary expressions (condition ? true : false)
  'MemberExpression', // Object property access (e.g., obj.prop)
  'Identifier', // Variable and function names
  'CallExpression', // Function calls
  'ArrayExpression', // Array literals []
  'ObjectExpression', // Object literals {}
  'Property', // Object property definitions
  'TemplateLiteral', // Template strings using backticks
  'TemplateElement', // Parts of template literals between expressions
]);

/**
 * Validate the given template string.
 * @param templateStr - The template string to validate
 * @throws {TemplateValidationError} If given template string is invalid
 */
export function validateTemplate(templateStr: string, allowedKeywords: string[] = []): undefined {
  const expressions = getTemplateMatches(templateStr, false) ?? [];

  for (const expr of expressions) {
    if (NEW_LINE_CHARS.some((nl) => expr.includes(nl))) {
      throw new TemplateValidationError('Multi-line expressions are not allowed');
    }

    const ast = acorn.parse(expr, {
      ecmaVersion: 2021,
      sourceType: 'script',
    });

    const parentMap = new WeakMap();

    const walkNode = (node: Node | Record<string, any>): void => {
      if (!node || typeof node !== 'object') return;

      // check if node type is allowed
      if (node.type) {
        if (!ALLOWED_NODE_TYPES.has(node.type)) {
          throw new TemplateValidationError(`Unauthorized operation type: ${node.type}`);
        }

        if (node.type === 'Identifier') {
          const identifierNode = node as Identifier;
          const parent = parentMap.get(node) as MemberExpression | undefined;
          const isPropertyName = parent?.type === 'MemberExpression' && parent.property === node;

          // check against both blocked globals and allowed identifiers
          if (!isPropertyName) {
            if (DISALLOWED_IDENTIFIERS.has(identifierNode.name)) {
              throw new TemplateValidationError(`${identifierNode.name} is not defined`);
            }

            if (
              !ALLOWED_IDENTIFIERS.has(identifierNode.name) &&
              allowedKeywords.length &&
              !allowedKeywords.includes(identifierNode.name)
            ) {
              throw new TemplateValidationError(`${identifierNode.name} is not defined`);
            }
          }
        }
      }

      // walk through all properties that could be nodes
      for (const key of Object.keys(node)) {
        const child = node[key as keyof typeof node];
        if (child && typeof child === 'object') {
          if (Array.isArray(child)) {
            child.forEach((item) => {
              if (item && typeof item === 'object') {
                parentMap.set(item, node);
                walkNode(item);
              }
            });
          } else {
            parentMap.set(child, node);
            walkNode(child);
          }
        }
      }
    };

    walkNode(ast);
  }
}
