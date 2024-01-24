import type { ChainBuilderContext } from '@usecannon/builder';

export type BuildOutputs = Partial<Pick<ChainBuilderContext, 'imports' | 'contracts' | 'txns' | 'extras'>>;
