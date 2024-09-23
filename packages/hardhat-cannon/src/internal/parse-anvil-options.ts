import fs from 'node:fs';
import { pickAnvilOptions } from '@usecannon/cli/dist/src/util/foundry-options';

export function parseAnvilOptions(anvilOptionsParam?: string) {
  if (!anvilOptionsParam) return {};
  const json = anvilOptionsParam.endsWith('.json') ? fs.readFileSync(anvilOptionsParam, 'utf8') : anvilOptionsParam;
  return pickAnvilOptions(JSON.parse(json));
}
