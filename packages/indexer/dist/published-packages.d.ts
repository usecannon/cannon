import * as viem from 'viem';
import { createClient } from 'redis';
import { CannonStorage } from '@usecannon/builder';
type ActualRedisClientType = ReturnType<typeof createClient>;
export declare function handleCannonPublish(ctx: CannonStorage, client: viem.PublicClient, redis: ActualRedisClientType, publishEvent: viem.Log & {
    args: {
        [name: string]: any;
    };
}, packageRef: string): Promise<void>;
export declare function loop(): Promise<void>;
export {};
//# sourceMappingURL=published-packages.d.ts.map