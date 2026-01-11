import { chainDefinitionSchema } from '@usecannon/builder/dist/src/schemas.js';
import fs from 'fs';

fs.writeFileSync(
  'schema.json',
  JSON.stringify(chainDefinitionSchema.toJSONSchema()),
);
