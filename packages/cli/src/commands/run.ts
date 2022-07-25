import _ from 'lodash';
import { Command } from 'commander';
import { PackageDefinition } from '../types';

export interface RunOptions {
  host?: string;
  port?: number;
  fork?: string;
  logs?: boolean;
  preset?: string;
  registryRpc?: string;
  registryAddress?: string;
  ipfsUrl?: string;
}

export async function run(packages: PackageDefinition[], options: RunOptions, program: Command) {
  console.log(packages);
  console.log(options);
}
