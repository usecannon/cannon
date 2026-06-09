import { chainDefinitionSchema } from '@usecannon/builder/dist/src/schemas.js';
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

console.log('Generated schema.json and schema-fragment.json');
