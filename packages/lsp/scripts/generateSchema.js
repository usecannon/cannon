import {
  chainDefinitionSchema,
  cannonfileFragmentSchema,
} from '@usecannon/builder/dist/src/schemas.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import fs from 'fs';
import path from 'path';

// Generate full cannonfile schema (requires name, version)
fs.writeFileSync(
  path.join('src', 'schema.json'),
  JSON.stringify(chainDefinitionSchema.toJSONSchema()),
);

// Generate fragment schema (for included TOML files without header)
fs.writeFileSync(
  path.join('src', 'schema-fragment.json'),
  JSON.stringify(zodToJsonSchema(cannonfileFragmentSchema)),
);

process.stdout.write('Generated schema.json and schema-fragment.json\n');
