import _ from 'lodash';
import { Command } from 'commander';

export default async function run(packages: string[], options: { [k: string]: string }, program: Command) {
  console.log(packages);
}

function parseSettings(settings: string[]) {
  return _.fromPairs(settings.map((kv: string) => kv.split('=')));
}
