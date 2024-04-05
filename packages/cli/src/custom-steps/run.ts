import { createRequire } from 'node:module';
import path from 'node:path';
import {
  ChainArtifacts,
  ChainBuilderContext,
  ChainBuilderRuntimeInfo,
  computeTemplateAccesses,
  PackageState,
  registerAction,
  mergeTemplateAccesses,
} from '@usecannon/builder';
import crypto from 'crypto';
import Debug from 'debug';
import fs from 'fs-extra';
import _ from 'lodash';
import { z } from 'zod';
import { runSchema } from '../schemas';

const debug = Debug('cannon:builder:run');

interface ErrorWithCode extends Error {
  code: string;
}

/**
 * Try to import a file relative to the given baseDir, if not present, try to
 * get the relative NPM Module.
 * @internal
 */
export async function importFrom(baseDir: string, fileOrModule: string) {
  try {
    return await import(path.resolve(baseDir, fileOrModule));
  } catch (e) {
    const err = e as ErrorWithCode;
    if (err.code === 'MODULE_NOT_FOUND') {
      const localRequire = createRequire(baseDir);
      return await import(localRequire.resolve(fileOrModule));
    }
    throw err;
  }
}

export function hashFs(path: string): Buffer {
  const dirHasher = crypto.createHash('sha256');

  // iterate through every file at path and build a checksum
  if (fs.statSync(path).isFile()) {
    const hasher = crypto.createHash('sha256');
    dirHasher.update(hasher.update(fs.readFileSync(path)).digest());
  } else {
    const subpaths = fs.readdirSync(path);

    for (const subpath of subpaths) {
      const fullname = `${path}/${subpath}`;
      dirHasher.update(hashFs(fullname));
    }
  }

  return dirHasher.digest();
}

/**
 *  Available properties for run step
 *  @public
 *  @group Run

 */
export type Config = z.infer<typeof runSchema>;

// ensure the specified contract is already deployed
// if not deployed, deploy the specified hardhat contract with specfied options, export address, abi, etc.
// if already deployed, reexport deployment options for usage downstream and exit with no changes
const runAction = {
  label: 'run',

  validate: runSchema,

  timeout: 3600000, // 1 hour, run steps can go for much longer

  async getState(runtime: ChainBuilderRuntimeInfo, ctx: ChainBuilderContext, config: Config) {
    const newConfig = this.configInject(ctx, config);

    const auxHashes = newConfig.modified.map((pathToScan: string) => {
      if (!fs.statSync(pathToScan).isFile() && !fs.statSync(pathToScan).isDirectory()) {
        throw new Error(`Invalid element in "modified" for "run" step. Path ${pathToScan} not found.`);
      }

      try {
        return hashFs(pathToScan).toString('hex');
      } catch (err) {
        if ((err as any).code === 'ENOENT') {
          //console.warn(`warning: could not check modified file at path '${pathToScan}'. this may be an error.`);
          //return 'notfound';

          // TODO: there is no other way to tell if the runtime state is even supposed to be evaluated other than the existance or not of modified file paths
          return null;
        } else {
          throw err;
        }
      }
    });

    // also hash the executed file itself
    auxHashes.push(newConfig.exec);

    return [
      {
        auxHashes,
        config: newConfig,
      },
    ];
  },

  configInject(ctx: ChainBuilderContext, config: Config) {
    config = _.cloneDeep(config);

    config.exec = _.template(config.exec)(ctx);

    config.modified = _.map(config.modified, (v) => {
      return _.template(v)(ctx);
    }) as [string, ...string[]];

    if (config.args) {
      config.args = _.map(config.args, (v) => {
        // just convert it to a JSON string when. This will allow parsing of complicated nested structures
        return JSON.parse(JSON.stringify(_.template(v)(ctx)));
      });
    }

    if (config.env) {
      config.env = _.map(config.env, (v) => {
        return _.template(v)(ctx);
      });
    }

    return config;
  },

  getInputs(config: Config) {
    let accesses = computeTemplateAccesses(config.exec);

    _.forEach(config.modified, (a) => (accesses = mergeTemplateAccesses(accesses, computeTemplateAccesses(a))));
    _.forEach(config.args, (a) => (accesses = mergeTemplateAccesses(accesses, computeTemplateAccesses(a))));
    _.forEach(config.env, (a) => (accesses = mergeTemplateAccesses(accesses, computeTemplateAccesses(a))));

    return accesses;
  },

  getOutputs(config: Config) {
    return config.outputs;
  },

  async exec(
    runtime: ChainBuilderRuntimeInfo,
    ctx: ChainBuilderContext,
    config: Config,
    packageState: PackageState
  ): Promise<ChainArtifacts> {
    debug('exec', config);

    if (!fs.statSync(config.exec).isFile()) {
      throw new Error(`Invalid "exec" value for "run" step. Path "${config.exec}" not found.`);
    }

    const runfile = await importFrom(process.cwd(), config.exec);

    const outputs = (await runfile[config.func](runtime, ...(config.args || []))) as Omit<ChainArtifacts, 'deployedOn'>;

    if (!_.isObject(outputs)) {
      throw new Error(
        'deployed contracts/txns not returned from script. Please supply any deployed contract in contracts property of returned json. If no contracts were deployed or transactions were run, return an empty object.'
      );
    }

    outputs.contracts = _.mapValues(outputs.contracts, (c) => ({
      ...c,
      deployedOn: packageState.currentLabel,
    }));

    outputs.txns = _.mapValues(outputs.txns, (t) => ({
      ...t,
      deployedOn: packageState.currentLabel,
    }));

    return outputs;
  },
};

registerAction(runAction);
