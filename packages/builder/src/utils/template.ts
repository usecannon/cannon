import _ from 'lodash';

export function template(str: string, data = {}) {
  try {
    return _.template(str)(data);
  } catch (err) {
    if (err instanceof Error) {
      err.message += ` at ${str}`;
    }

    throw err;
  }
}
