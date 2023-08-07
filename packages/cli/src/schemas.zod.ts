import { z } from 'zod';
import fs from 'fs-extra';

/// ================================ INPUT CONFIG SCHEMAS ================================ \\\

// Different regular expressions used to validate formats like
// general string interpolation, step names, contract artifacts and packages
const stepRegex = RegExp(/^[\w-]+\.[\w-]+$/, 'i');

export const runSchema = z
  .object({
    /** The javascript (or typescript) file to load  */
    exec: z.string().refine((val) => fs.statSync(val).isFile()),
    /** The function to call in this file  */
    func: z.string(),
    /**
     * An array of files and directories that this script depends on.
     * The cache of the cannonfile's build is recreated when these files change.
     */
    modified: z.array(z.string().refine((val) => fs.statSync(val).isFile() || fs.statSync(val).isDirectory())).nonempty(),
  })
  .merge(
    z
      .object({
        /** Arguments passed to the function (after the ChainBuilder object) */
        args: z.array(z.string()),
        /** Environment variables to be set on the script */
        env: z.array(z.string()),
        /** List of steps that this action depends on */
        depends: z.array(
          z.string().refine(
            (val) => Boolean(val.match(stepRegex)),
            (val) => ({
              message: `Bad format for "${val}". Must reference a previous step, example: 'contract.Storage'`,
            })
          )
        ),
      })
      .partial()
  );
