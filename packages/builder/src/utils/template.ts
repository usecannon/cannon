import 'ses';
import _ from 'lodash';
import Debug from 'debug';
import Fuse from 'fuse.js';
import * as acorn from 'acorn';
import { Node, Identifier, MemberExpression } from 'acorn';
import { CANNON_GLOBALS, CannonHelperContext, JS_GLOBALS } from '../types';
import { getGlobalVars } from './get-global-vars';

import type { TemplateOptions } from 'lodash';

const debug = Debug('cannon:builder:template');

const DISALLOWED_IDENTIFIERS = new Set([
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
const DISALLOWED_KEYWORDS = new Set(
  [...Array.from(DISALLOWED_IDENTIFIERS), ...Array.from(getGlobalVars())].filter((g) => !JS_GLOBALS.includes(g))
);

// Debug log the complete list if needed
if (debug.enabled) {
  debug('Complete list of blocked globals:', Array.from(DISALLOWED_KEYWORDS));
}

/**
 * Get the set of allowed identifiers for template execution.
 * @returns Set of allowed identifiers
 */
function _getAllowedIdentifiers(): Set<string> {
  // Only return the explicitly allowed identifiers
  const allowed = new Set([
    ...CANNON_GLOBALS,
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
export function getTemplateMatches(str: string, includeTags = true) {
  const results = Array.from(str.matchAll(/<%[=-]([\s\S]+?)%>/g));
  return results.map((r) => (includeTags ? r[0] : r[1].trim()));
}

/**
 * Lodash template function wrapper.
 * It adds a fuzzy search for the keys in the data object in case the user made a typo.
 */
export function renderTemplate(str?: string) {
  const render = _.template(str);

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
 * @param context - The template context object, includes the variables to be used in the template
 * @returns The evaluated result
 */
export function template(templateStr: string, templateContext: Record<string, any> = {}) {
  const code = 'renderTemplate(templateStr)(templateContext)';

  const compartmentContext = {
    templateStr,
    templateContext,
    globals: {},
    renderTemplate,
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
    threshold: 0.3,
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

const allowedNodeTypes = new Set<acorn.Node['type']>([
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

/**
 * Validate the given template string.
 * @param templateStr - The template string to validate
 * @throws {TemplateValidationError} If given template string is invalid
 */
export function validateTemplate(templateStr: string): undefined {
  const allowedIdentifiers = _getAllowedIdentifiers();

  const expressions = getTemplateMatches(templateStr, false) ?? [];

  for (const expr of expressions) {
    // prevent multi-line expressions
    if (NEW_LINE_CHARS.some((nl) => expr.includes(nl))) {
      throw new TemplateValidationError('Multi-line expressions are not allowed');
    }

    const ast = acorn.parse(expr, {
      ecmaVersion: 'latest',
      sourceType: 'module',
    });

    const parentMap = new WeakMap();

    const walkNode = (node: Node | Record<string, any>): void => {
      if (!node || typeof node !== 'object') return;

      // check if node type is allowed
      if (node.type) {
        if (node.type === 'AssignmentExpression') {
          throw new TemplateValidationError(
            `Assignment operator "${(node as acorn.AssignmentExpression).operator}" is not allowed`
          );
        }

        if (!allowedNodeTypes.has(node.type)) {
          throw new TemplateValidationError(`Unauthorized operation type: ${node.type}`);
        }

        if (node.type === 'Identifier') {
          const identifierNode = node as Identifier;
          const parent = parentMap.get(node) as MemberExpression | undefined;
          const isPropertyName = parent?.type === 'MemberExpression' && parent.property === node;

          // check against both blocked globals and allowed identifiers
          if (!isPropertyName) {
            if (DISALLOWED_KEYWORDS.has(identifierNode.name)) {
              throw new TemplateValidationError(`Access to identifier "${identifierNode.name}" is not allowed`);
            }

            if (!allowedIdentifiers.has(identifierNode.name)) {
              throw new TemplateValidationError(`Unauthorized identifier found: ${identifierNode.name}`);
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
