import 'ses';
import _ from 'lodash';
import Debug from 'debug';
import Fuse from 'fuse.js';
import type { TemplateOptions } from 'lodash';
import * as acorn from 'acorn';
import { Node, Identifier, MemberExpression } from 'acorn';
import { CannonHelperContext } from '../types';
import { getGlobalVars } from './get-global-vars';

const debug = Debug('cannon:builder:template');

/**
 * List of legal and illegal globals so we can use them in validation
 */
export const PERMITTED_GLOBALS = new Set([
  // Fundamental objects
  'Array',
  'BigInt',
  'Buffer',
  'Date',
  'Map',
  'Number',
  'Object',
  'RegExp',
  'Set',
  'String',
  'Symbol',
  'WeakMap',
  'WeakSet',

  // Functions
  'JSON',
  'Math',
  'Intl',
  'parseFloat',
  'parseInt',
  'isNaN',
  'isFinite',
  'console',
  'atob',
  'btoa',
  'decodeURI',
  'encodeURI',
  'decodeURIComponent',
  'encodeURIComponent',
]);

const BLOCKED_GLOBALS = new Set([
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
  'delete',
  'debugger',
  'do',
  'else',
  'export',
  'extends',
  'finally',
  'for',
  'function',
  'function*',
  'if',
  'import',
  'let',
  'new',
  'prototype',
  'return',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'try',
  'var',
  'while',
  'with',
  'yield',
]);

// Cache the global properties to avoid recomputing them on every validation
const COMPLETE_BLOCKED_GLOBALS = new Set(
  [...Array.from(BLOCKED_GLOBALS), ...Array.from(getGlobalVars())].filter((g) => !PERMITTED_GLOBALS.has(g))
);

// Debug log the complete list if needed
if (debug.enabled) {
  debug('Complete list of blocked globals:', Array.from(COMPLETE_BLOCKED_GLOBALS));
}

/**
 * Get the set of allowed identifiers for template execution.
 * @returns Set of allowed identifiers
 */
function getAllowedIdentifiers(): Set<string> {
  // Only return the explicitly allowed identifiers
  const allowed = new Set([
    'contracts',
    'imports',
    'extras',
    'txns',
    'settings',
    // Add any other explicitly allowed identifiers from CannonHelperContext
    ...Object.keys(CannonHelperContext),
  ]);

  return allowed;
}

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
export function getTemplateMatches(str: string) {
  const results = Array.from(str.matchAll(/<%[=-]([\s\S]+?)%>/g));
  return results.map((r) => r[0]);
}

/**
 * Lodash template function wrapper.
 * It adds a fuzzy search for the keys in the data object in case the user made a typo.
 */
export function template(str?: string, options?: TemplateOptions) {
  const render = _.template(str, options);

  return (data?: object) => {
    try {
      return render(data);
    } catch (err) {
      if (err instanceof Error) {
        err.message += ` at ${str}`;

        // Do a fuzzy search in the given context, in the case the user did a typo
        // we look for something close in the current data context object.
        if (data && err.message.includes('Cannot read properties of undefined')) {
          const match = err.message.match(/\(reading '([^']+)'\)/);
          if (match && match[1]) {
            const desiredKey = match[1];
            const allKeys = Array.from(_getAllKeys(data));
            const results = _fuzzySearch(allKeys, desiredKey);
            if (results.length) {
              err.message += "\n\n Here's a list of some fields available in this context, did you mean one of these?";
              for (const res of results) err.message += `\n    ${res}`;
            }
          }
        }
      }

      throw err;
    }
  };
}

/**
 * Executes a template string in a SES secure compartment.
 * @param templateStr - The template string to evaluate
 * @param context - The context object containing endowments
 * @param importKey - The key to use for imports (defaults to 'ctx')
 * @returns The evaluated result
 */
export function executeTemplate(templateStr: string, context: Record<string, any> = {}, importKey: 'ctx' | 'recorders') {
  const code = `template(${JSON.stringify(templateStr)}, { imports: ${importKey} })()`;

  const endowments = {
    [importKey]: context,
    globals: {}, // empty globals object
    template, // lodash template function wrapper
  };

  try {
    // eslint-disable-next-line no-undef
    const compartmentWithEndowments = new Compartment({ ...endowments });
    return compartmentWithEndowments.evaluate(code);
  } catch (error) {
    debug('Execution failed:', error);
    throw error;
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
    threshold: 0.3,
  });

  return searcher.search(query).map(({ item }) => item);
}

// list of allowed node types
type AllowedNodeType =
  | 'Program'
  | 'ExpressionStatement'
  | 'Literal'
  | 'BinaryExpression'
  | 'LogicalExpression'
  | 'ConditionalExpression'
  | 'MemberExpression'
  | 'Identifier'
  | 'CallExpression'
  | 'ArrayExpression'
  | 'ObjectExpression'
  | 'Property'
  | 'TemplateLiteral'
  | 'TemplateElement';

/**
 * Validate the given template string.
 * @param templateStr - The template string to validate
 * @returns Object with isValid and error properties
 */
export function validateTemplate(templateStr: string): { isValid: boolean; error?: string } {
  try {
    const allowedIdentifiers = getAllowedIdentifiers();

    const allowedNodeTypes: Set<AllowedNodeType> = new Set([
      'Program', // Root node of the ast
      'ExpressionStatement', // Represents a single expression
      'Literal', // Represents literal values (numbers, strings, booleans, etc.)
      'BinaryExpression', // Mathematical or comparison operations (e.g., +, -, *, /, >, <)
      'LogicalExpression', // Logical operations (&&, ||)
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

    const expressions = getTemplateMatches(templateStr) ?? [];

    for (const expr of expressions) {
      // prevent multi-line expressions
      if (expr.includes('\n')) {
        throw new Error('Multi-line expressions are not allowed');
      }

      const jsContent = expr.replace(/<%[=-]?\s*/, '').replace(/\s*%>/, '');

      // check for standalone assignment operator
      const assignmentRegex = /(?:^|[^!=<>])=(?!=)/;
      if (assignmentRegex.test(jsContent)) {
        throw new Error('Assignment operator "=" is not allowed');
      }

      // check for other dangerous operators
      const otherDangerousOperators = ['+=', '-=', '*=', '/=', '++', '--'];
      for (const op of otherDangerousOperators) {
        if (jsContent.includes(op)) {
          throw new Error(`Assignment operator "${op}" is not allowed`);
        }
      }

      const ast = acorn.parse(jsContent, {
        ecmaVersion: 'latest',
        sourceType: 'module',
      });

      const parentMap = new WeakMap();

      const walkNode = (node: Node | Record<string, any>): void => {
        if (!node || typeof node !== 'object') return;

        // check if node type is allowed
        if ('type' in node && !allowedNodeTypes.has(node.type)) {
          throw new Error(`Unauthorized operation type: ${node.type}`);
        }

        if ('type' in node && node.type === 'Identifier') {
          const identifierNode = node as Identifier;
          const parent = parentMap.get(node) as MemberExpression | undefined;
          const isPropertyName = parent?.type === 'MemberExpression' && parent.property === node;

          // check against both blocked globals and allowed identifiers
          if (!isPropertyName) {
            if (COMPLETE_BLOCKED_GLOBALS.has(identifierNode.name)) {
              throw new Error(`Access to blocked global "${identifierNode.name}" is not allowed`);
            }
            if (!allowedIdentifiers.has(identifierNode.name)) {
              throw new Error(`Unauthorized identifier found: ${identifierNode.name}`);
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

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
