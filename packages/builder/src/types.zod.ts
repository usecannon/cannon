import { ethers } from 'ethers';

import { JsonFragment } from '@ethersproject/abi';

import _ from 'lodash';

import type { RawChainDefinition } from './actions';
import { CannonWrapperGenericProvider } from './error/provider';

import { z } from 'zod';

export const OptionTypesTsSchema = z.union([z.string(), z.number(), z.boolean()]);

export const ContractArtifactSchema = z.object({
  contractName: z.string(),
  sourceName: z.string(),
  abi: z.array(
    z.custom<{ arg: JsonFragment }>(() => {
      true;
    })
  ),
  bytecode: z.string(),
  deployedBytecode: z.string(),
  linkReferences: z.record(
    z.record(
      z.array(
        z.object({
          start: z.number(),
          length: z.number(),
        })
      )
    )
  ),
  source: z
    .object({
      solcVersion: z.string(),
      input: z.string(),
    })
    .optional(),
});

export const ContractDataSchema = z.object({
  address: z.string(),
  abi: z.array(
    z.custom<{ arg: JsonFragment }>(() => {
      true;
    })
  ),
  constructorArgs: z.array(z.any()).optional(),
  linkedLibraries: z.record(z.record(z.string())).optional(),
  sourceCode: z.string().optional(),
  deployTxnHash: z.string(),
  contractName: z.string(),
  sourceName: z.string(),
  deployedOn: z.string(),
});

export const ContractMapSchema = z.record(ContractDataSchema);

export const EventMapSchema = z.record(
  z.array(
    z.object({
      args: z.array(z.string()),
    })
  )
);

export const PreChainBuilderContextSchema = z.object({
  chainId: z.number(),
  package: z.any(),
  timestamp: z.string(),
});

export const ChainBuilderContextSchema = PreChainBuilderContextSchema.extend({
  settings: z.custom<z.infer<typeof ChainBuilderOptionsSchema>>(() => {
    true;
  }),
  contracts: z.custom<z.infer<typeof ChainBuilderOptionsSchema>>(() => {
    true;
  }),
  txns: z.custom<z.infer<typeof ChainBuilderOptionsSchema>>(() => {
    true;
  }),

  extras: z.record(z.string()),

  imports: z.custom<z.infer<typeof ChainBuilderOptionsSchema>>(() => {
    true;
  }),
});

export const ChainBuilderContextWithHelpersSchema = ChainBuilderContextSchema.and(z.any()).and(z.any());

export const BuildOptionsSchema = z.record(OptionTypesTsSchema);

export const StorageModeSchema = z.union([z.literal('all'), z.literal('metadata'), z.literal('none')]);

export const ChainBuilderRuntimeInfoSchema = z.object({
  provider: z.custom<{ arg: CannonWrapperGenericProvider }>(() => {
    true;
  }),
  chainId: z.number(),
  getSigner: z
    .function()
    .args(z.string())
    .returns(
      z.promise(
        z.custom<{ arg: ethers.Signer }>(() => {
          true;
        })
      )
    ),
  getDefaultSigner: z
    .function()
    .args(z.any(), z.string().optional())
    .returns(
      z.promise(
        z.custom<{ arg: ethers.Signer }>(() => {
          true;
        })
      )
    )
    .optional(),
  getArtifact: z.function().args(z.string()).returns(z.promise(ContractArtifactSchema)).optional(),
  snapshots: z.boolean(),
  allowPartialDeploy: z.boolean(),
  publicSourceCode: z.boolean().optional(),
  gasPrice: z.string().optional(),
  gasFee: z.string().optional(),
  priorityGasFee: z.string().optional(),
});

export const PackageStateSchema = z.object({
  name: z.string(),
  version: z.string(),
  currentLabel: z.string(),
});

export const ChainArtifactsSchema = ChainBuilderContextSchema.pick({
  imports: true,
  contracts: true,
  txns: true,
  extras: true,
});

export const ChainBuilderOptionsSchema = z.record(OptionTypesTsSchema);

export const DeploymentManifestSchema = z.object({
  def: z.custom<{ arg: RawChainDefinition }>(() => {
    true;
  }),
  npmPackage: z.any(),
  upgradeFrom: z.string().optional(),
  misc: z.object({
    ipfsHash: z.string(),
  }),
  deploys: z.record(
    z.record(
      z.object({
        hash: z.string(),
      })
    )
  ),
});

export const StepStateSchema = z.object({
  version: z.number(),
  hash: z.string().nullable(),
  artifacts: ChainArtifactsSchema,
  chainDump: z.string().optional(),
});

export const DeploymentStateSchema = z.record(StepStateSchema);

export const TransactionMapSchema = z.record(
  z.object({
    hash: z.string(),
    events: EventMapSchema,
    deployedOn: z.string(),
  })
);

export const BundledOutputSchema = z
  .object({
    url: z.string(),
    tags: z.array(z.string()).optional(),
    preset: z.string().optional(),
  })
  .and(ChainArtifactsSchema);

export const BundledChainBuilderOutputSchema = z.record(BundledOutputSchema);

export const DeploymentInfoSchema = z.object({
  def: z.custom<{ arg: RawChainDefinition }>(() => {
    true;
  }),
  options: ChainBuilderOptionsSchema,
  status: z.union([z.literal('complete'), z.literal('partial'), z.literal('none')]).optional(),
  state: DeploymentStateSchema,
  meta: z.any(),
  miscUrl: z.string(),
  chainId: z.number().optional(),
});

export type ChainBuilderContextType = z.infer<typeof ChainBuilderContextSchema>;

export function combineCtx(ctxs: ChainBuilderContextType[]): ChainBuilderContextType {
  const ctx = _.clone(ctxs[0]);

  ctx.timestamp = Math.floor(Date.now() / 1000).toString(); //(await this.provider.getBlock(await this.provider.getBlockNumber())).timestamp.toString();

  // merge all blockchain outputs
  for (const additionalCtx of ctxs.slice(1)) {
    ctx.contracts = { ...ctx.contracts, ...additionalCtx.contracts };
    ctx.txns = { ...ctx.contracts, ...additionalCtx.contracts };
    ctx.imports = { ...ctx.imports, ...additionalCtx.imports };
    ctx.extras = { ...ctx.extras, ...additionalCtx.extras };
  }

  return ctx;
}

export type ValidationSchema = z.ZodObject<{
  // Properties
  target?: z.ZodArray<z.ZodString, 'atleastone'>;
  exec?: z.ZodString;
  func?: z.ZodString;
  modified?: z.ZodArray<z.ZodString, 'atleastone'>;
  artifact?: z.ZodString;
  source?: z.ZodString;

  // Optional Properties
  chainId?: z.ZodOptional<z.ZodNumber>;
  preset?: z.ZodOptional<z.ZodString>;
  args?: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>> | z.ZodOptional<z.ZodArray<z.ZodAny, 'many'>>;
  env?: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
  depends?: z.ZodOptional<z.ZodTypeAny>;
  create2?: z.ZodOptional<z.ZodBoolean>;
  from?: z.ZodOptional<z.ZodString>;
  fromCall?: z.ZodOptional<
    z.ZodObject<{
      func: z.ZodOptional<z.ZodString>;
      args: z.ZodOptional<z.ZodArray<z.ZodAny, 'many'>>;
    }>
  >;
  nonce?: z.ZodOptional<z.ZodString>;
  abi?: z.ZodOptional<z.ZodString>;
  abiOf?: z.ZodOptional<z.ZodArray<z.ZodString>>;
  libraries?: z.ZodOptional<z.ZodRecord<z.ZodString>>;
  salt?: z.ZodOptional<z.ZodString>;
  value?: z.ZodOptional<z.ZodString>;
  overrides?: z.ZodOptional<
    z.ZodObject<{
      gasLimit?: z.ZodOptional<z.ZodString>;
    }>
  >;
  extra?: z.ZodOptional<
    z.ZodRecord<
      z.ZodString,
      z.ZodObject<{
        event: z.ZodString;
        arg: z.ZodNumber;
        allowEmptyEvents: z.ZodOptional<z.ZodBoolean>;
      }>
    >
  >;
  factory?: z.ZodOptional<
    z.ZodRecord<
      z.ZodString,
      z.ZodObject<{
        event: z.ZodString;
        arg: z.ZodNumber;
        artifact: z.ZodOptional<z.ZodString>;
        abiOf: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
        constructorArgs: z.ZodOptional<z.ZodArray<z.ZodAny, 'many'>>;
        allowEmptyEvents: z.ZodOptional<z.ZodBoolean>;
      }>
    >
  >;
}>;
