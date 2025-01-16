import { ChainArtifacts, traceActions } from '@usecannon/builder';
import { CannonProvider } from '../types';

export function augmentProvider(originalProvider: CannonProvider, outputs: ChainArtifacts) {
  const provider = originalProvider.extend(traceActions(outputs) as any) as unknown as CannonProvider;

  // Monkey patch to call original cannon extended estimateGas fn
  const originalRequest = provider.request;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  provider.request = async function request(args: any) {
    if (args.method === 'eth_estimateGas') {
      return await provider.estimateGas({
        maxFeePerGas: args.params[0].maxFeePerGas,
        maxPriorityFeePerGas: args.params[0].maxPriorityFeePerGas,
        account: args.params[0].from,
        to: args.params[0].to,
        data: args.params[0].data,
        value: args.params[0].value,
      });
    }

    return await originalRequest(args);
  } as any;

  return provider;
}
