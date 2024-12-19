import 'ses';
import _ from 'lodash';
import Debug from 'debug';
import Fuse from 'fuse.js';
import type { TemplateOptions } from 'lodash';
import * as acorn from 'acorn';
import { Node, Identifier, MemberExpression } from 'acorn';
import { CannonHelperContext } from '../types';

const debug = Debug('cannon:builder:template');

/**
 * Gets all global properties from various JavaScript environments
 * @returns Set of all discovered global properties
 */
function getAllGlobalProperties(): Set<string> {
  const globals = new Set<string>();

  // Helper to safely get all properties from an object and its prototype chain
  const getAllPropertiesFromObject = (obj: any) => {
    while (obj) {
      try {
        Object.getOwnPropertyNames(obj).forEach((prop) => globals.add(prop));
        obj = Object.getPrototypeOf(obj);
      } catch (e) {
        break; // Stop if we can't access further
      }
    }
  };

  // Check globalThis
  getAllPropertiesFromObject(globalThis);

  // Check window in browser environment
  if (typeof window !== 'undefined') {
    getAllPropertiesFromObject(window);
  }

  // Check global in Node.js environment
  if (typeof global !== 'undefined') {
    getAllPropertiesFromObject(global);
  }

  // Check self (used in Web Workers)
  if (typeof self !== 'undefined') {
    getAllPropertiesFromObject(self);
  }

  // Get properties from Function constructor
  try {
    const functionProps = new Function('return Object.getOwnPropertyNames(this)')();
    functionProps.forEach((prop: string) => globals.add(prop));
  } catch (e) {
    // Ignore if blocked
  }

  // Remove allowed objects like JSON, Number, Math from the global properties
  // TODO: do we need to whitelist any other objects?
  const allowedGlobals = ['JSON', 'Number', 'Math', 'String', 'parseFloat', 'parseInt', 'isNaN', 'console'];
  allowedGlobals.forEach((allowed) => globals.delete(allowed));

  return globals;
}

/**
 * List of blocked globals so we can use them in validation
 */
const BLOCKED_GLOBALS = new Set([
  // reserved keywords
  'var',
  'const',
  'let',
  'function',
  'return',
  'if',
  'else',
  'for',
  'while',
  'do',
  'switch',
  'case',
  'break',
  'continue',
  'throw',
  'try',
  'catch',
  'finally',
  'import',
  'export',
  'async',
  'await',
  'this',
  'super',
  'new',
  'class',
  'extends',
  'static',

  // other potentially dangerous apis that might not be globals in all environments
  'constructor',
  'prototype',
  '__proto__',
  'arguments',
  'caller',
  'callee',
]);

// Cache the global properties to avoid recomputing them on every validation
const GLOBAL_PROPERTIES = getAllGlobalProperties();
const COMPLETE_BLOCKED_GLOBALS = new Set([...Array.from(BLOCKED_GLOBALS), ...Array.from(GLOBAL_PROPERTIES)]);

// Debug log the complete list if needed
debug('Complete list of blocked globals:', Array.from(COMPLETE_BLOCKED_GLOBALS).sort());

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
            const allKeys = Array.from(getAllKeys(data));
            const results = fuzzySearch(allKeys, desiredKey);
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
function getAllKeys(obj: { [key: string]: any }, parentKey = '', keys: Set<string> = new Set()) {
  for (const key of Object.keys(obj)) {
    const fullKey = parentKey ? `${parentKey}.${key}` : key;
    keys.add(fullKey);
    if (_.isPlainObject(obj[key])) getAllKeys(obj[key], fullKey, keys);
  }

  return keys;
}

/**
 * Perform a fuzzy search on the given data array.
 * @param data - The data array to search
 * @param query - The query string to search for
 * @returns Array of matching items
 */
function fuzzySearch(data: string[], query: string) {
  const searcher = new Fuse<string>(data, {
    ignoreLocation: true,
    threshold: 0.3,
  });

  return searcher.search(query).map(({ item }) => item);
}

/**
 * Validate the given template string.
 * @param templateStr - The template string to validate
 * @returns Object with isValid and error properties
 */
export function validateTemplate(templateStr: string): { isValid: boolean; error?: string } {
  try {
    const allowedIdentifiers = getAllowedIdentifiers();

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

    if (expressions.length === 0) {
      //throw new Error('No template expressions found');
    }

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

interface ValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
  metadata?: {
    executionTime: number;
    expressionsFound: number;
  };
}
