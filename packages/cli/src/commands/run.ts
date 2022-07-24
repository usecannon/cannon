import _ from 'lodash';

export async function run(packages: string[]) {
  console.log(packages);
}

function parseSettings(settings: string[]) {
  return _.fromPairs(settings.map((kv: string) => kv.split('=')));
}
