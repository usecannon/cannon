import type { ChainArtifacts } from '@usecannon/builder';
import type { Config as StepDeploy } from '@usecannon/builder/dist/src/steps/deploy';
import type { Config as StepInvoke } from '@usecannon/builder/dist/src/steps/invoke';
import type { Config as StepRouter } from '@usecannon/builder/dist/src/steps/router';
import type { Config as StepPull } from '@usecannon/builder/dist/src/steps/pull';
import type { Config as StepClone } from '@usecannon/builder/dist/src/steps/clone';
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
      type: 'deploy';
      step: StepDeploy;
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
      type: 'pull';
      step: StepPull;
    })
  | (BaseDumpLine & {
      type: 'clone';
      step: StepClone;
    });

export type DumpRenderer = () => any;
