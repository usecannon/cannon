import type { ChainArtifacts } from '@usecannon/builder';
import type { Config as StepContract } from '@usecannon/builder/src/steps/deploy';
import type { Config as StepInvoke } from '@usecannon/builder/src/steps/invoke';
import type { Config as StepRouter } from '@usecannon/builder/src/steps/router';
import type { Config as StepImport } from '@usecannon/builder/src/steps/pull';
import type { Config as StepProvision } from '@usecannon/builder/src/steps/provision';
import * as viem from 'viem';

type BaseDumpLine = {
  label: string;
  depth: number;
  result?: ChainArtifacts; // Step is called pre step execution if missing result
  txns: viem.Transaction[]; // Executed transactions
};

/**
 * Type of each dump's line, each line has to be self contained and include all
 * the required information so it can be safely streamed during usage.
 */
export type DumpLine =
  | (BaseDumpLine & {
      type: 'contract';
      step: StepContract;
    })
  | (BaseDumpLine & {
      type: 'invoke';
      step: StepInvoke;
    })
  | (BaseDumpLine & {
      type: 'router';
      step: StepRouter;
    })
  | (BaseDumpLine & {
      type: 'import';
      step: StepImport;
    })
  | (BaseDumpLine & {
      type: 'provision';
      step: StepProvision;
    });

export type DumpRenderer = () => any;
