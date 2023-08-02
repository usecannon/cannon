import { z } from 'zod';

/**
 *  Returns a custom error message on failure for each parameter in the failed step
 */ 
export function handleZodErrors(errors: z.ZodIssue[]) {
  

  const errorMessages = errors.map((error) => {
    if (error.path.length > 1) {
      return `\n Field: ${error.path.toString().replace(/,/g, '.').replace(/.(\d+\d?)/g, "[$1]")} \n Error: ${error.message}`
    } else {
     return `\n Field: ${error.path} \n Error: ${error.message}`
    }
  });

  const errorMessage = '\n\n Validation Failed \n' + errorMessages.join('\n');

  throw errorMessage;
}
