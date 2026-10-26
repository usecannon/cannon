import { chainDefinitionSchema, cannonfileFragmentSchema } from '@usecannon/builder/dist/src/schemas.js';
import fs from 'fs';
import path from 'path';

// Generate full cannonfile schema (requires name, version)
// `io: 'input'` keeps the pre-transform shapes (e.g. the `nonce` union) which is
// what gets validated when editing a TOML file
fs.writeFileSync(
  path.join('src', 'schema.json'),
  JSON.stringify(chainDefinitionSchema.toJSONSchema({ io: 'input' })),
);

// Generate fragment schema (for included TOML files without header)
fs.writeFileSync(
  path.join('src', 'schema-fragment.json'),
  JSON.stringify(cannonfileFragmentSchema.toJSONSchema({ io: 'input' })),
);

process.stdout.write('Generated schema.json and schema-fragment.json\n');
