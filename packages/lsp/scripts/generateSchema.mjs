import { chainDefinitionSchema } from '@usecannon/builder/dist/src/schemas.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import fs from 'fs';

fs.writeFileSync(
  'schema.json',
  JSON.stringify(zodToJsonSchema(chainDefinitionSchema))
);
