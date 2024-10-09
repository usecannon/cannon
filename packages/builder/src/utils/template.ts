import Fuse from 'fuse.js';
import _ from 'lodash';

import type { TemplateOptions } from 'lodash';

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

function getAllKeys(obj: { [key: string]: any }, parentKey = '', keys: Set<string> = new Set()) {
  for (const key of Object.keys(obj)) {
    const fullKey = parentKey ? `${parentKey}.${key}` : key;
    keys.add(fullKey);
    if (_.isPlainObject(obj[key])) getAllKeys(obj[key], fullKey, keys);
  }

  return keys;
}

function fuzzySearch(data: string[], query: string) {
  const searcher = new Fuse<string>(data, {
    ignoreLocation: true,
    threshold: 0.3,
  });

  return searcher.search(query).map(({ item }) => item);
}
