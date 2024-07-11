import { z } from 'zod';

/**
 *  Returns a custom error message on failure for each parameter in the failed step
 */
export function handleZodErrors(errors: z.ZodIssue[]) {
  const errorMessages = errors.map((error) => {
    if (error.path.length > 1) {
      return `\n Field: ${error.path
        .toString()
        .replace(/,/g, '.')
        .replace(/.(\d+\d?)/g, '[$1]')} \n Error: ${error.message}`;
    } else {
      return `\n Field: ${error.path} \n Error: ${error.message}`;
    }
  });

  const errorMessage = '\n\n Validation Failed \n' + errorMessages.join('\n');

  throw new Error(errorMessage);
}

/**
 * Overwrites Zod's default error map to add custom messages
 */
export const customErrorMap: z.ZodErrorMap = (error, ctx) => {
  // This is where we override the various error codes
  switch (error.code) {
    case z.ZodIssueCode.invalid_type:
      if (error.received === 'undefined') {
        return {
          message: 'Field is required',
        };
      } else if (error.expected === 'array' && error.received === 'array') {
        return {
          message: `Expected all items in array field to be of type ${error.expected} but got ${error.received}`,
        };
      } else {
        return {
          message: `Expected field to be of type ${error.expected} but got ${error.received}`,
        };
      }
    case z.ZodIssueCode.too_big:
      return {
        message: `Expected ${error.path[0]} to equal less than ${error.maximum} but got ${ctx.data.length}`,
      };
    case z.ZodIssueCode.too_small:
      return {
        message: `Expected ${error.path[0]} to equal more than ${error.minimum} but got ${ctx.data.length}`,
      };
    case z.ZodIssueCode.invalid_enum_value:
      return {
        message: `Enum must be one of the following options ${error.options}`,
      };
    default:
      // fall back to default message
      return { message: ctx.defaultError };
  }
};

z.setErrorMap(customErrorMap);
