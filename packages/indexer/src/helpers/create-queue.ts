import { Job as BullJob, Queue as BullQueue, Worker as BullWorker } from 'bullmq';
import { parseRedisUrl } from './redis';

export interface QueueOptions {
  redisUrl: string;
  queueName: string;
  retries: number;
  defaultConcurrency: number;
}

export interface WorkerOptions {
  concurrency: number;
}

export interface DefaultJobContext<JobName extends string, JobData = any> {
  queue: BullQueue<JobData, void, JobName>;
  add: (name: JobName, data: JobData) => Promise<BullJob<JobData, void, JobName>>;
  createBatch: () => {
    add: (name: JobName, data: JobData) => QueueJobAttributes<JobName, JobData>;
    exec: () => Promise<void>;
  };
}

export interface QueueJobAttributes<JobName extends string, JobData = any> {
  name: JobName;
  data: JobData;
  opts?: { jobId: string };
}

export interface JobSchema<JobName extends string, JobData, JobContext extends DefaultJobContext<JobName, JobData>> {
  name: JobName;
  action: (data: JobData, ctx: JobContext) => QueueJobAttributes<JobName, JobData>;
  handler: (data: JobData, ctx: JobContext) => Promise<void>;
}

interface ParsedJobsSchemas<JobName extends string, JobData, JobContext extends DefaultJobContext<JobName, JobData>> {
  jobs: JobSchema<JobName, JobData, JobContext>[];
  ctx: JobContext;
}

export function createJobs<T extends JobSchema<string, any, DefaultJobContext<string, any>>, GivenJobContext>(
  jobs: T[],
  ctx: GivenJobContext = {} as GivenJobContext
) {
  type JobName = T['name'];
  type JobData = Parameters<T['action']>[0];
  type JobContext = GivenJobContext & DefaultJobContext<JobName, JobData>;

  return {
    jobs,
    ctx: ctx as JobContext,
  } satisfies ParsedJobsSchemas<JobName, JobData, JobContext>;
}

export function createQueue<T extends ParsedJobsSchemas<string, any, DefaultJobContext<string, any>>>(
  jobs: T,
  queueOpts: QueueOptions
) {
  type QueueJobName = T['jobs'][number]['name'];
  type QueueJobData = Parameters<T['jobs'][number]['action']>[0];
  type QueueJob = BullJob<QueueJobData, void, QueueJobName>;
  type QueueContext = T['ctx'] & DefaultJobContext<QueueJobName, QueueJobData>;

  const connection = parseRedisUrl(queueOpts.redisUrl);

  const queue = new BullQueue<QueueJobData, void, QueueJobName>(queueOpts.queueName, {
    connection,
    defaultJobOptions: {
      attempts: queueOpts.retries,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    },
  });

  const jobCtx = { ...jobs.ctx, queue, add, createBatch } as unknown as QueueContext;

  function createAction(name: QueueJobName, data: QueueJobData) {
    const actionCreator = jobs.jobs.find((j) => j.name === name)?.action;
    if (!actionCreator) throw new Error(`Unknown job name: ${name}`);
    const job = actionCreator(data, jobCtx);
    if (!job) throw new Error(`Missing action response for job: ${name} ${data}`);
    return job;
  }

  async function add(name: QueueJobName, data: QueueJobData) {
    const job = await createAction(name, data);
    return queue.add(job.name as any, job.data, job.opts);
  }

  function createBatch() {
    const jobs: QueueJobAttributes<QueueJobName, QueueJobData>[] = [];

    return {
      add(name: QueueJobName, data: QueueJobData) {
        const action = createAction(name, data);
        jobs.push(action);
        return action;
      },
      async exec() {
        return queue.addBulk(jobs as any);
      },
    };
  }

  const workers: BullWorker<QueueJobData, any, QueueJobName>[] = [];
  function createWorker(workerOpts?: WorkerOptions) {
    const concurrency = workerOpts?.concurrency || queueOpts?.defaultConcurrency || 1;

    const worker = new BullWorker<QueueJobData, any, QueueJobName>(
      queueOpts.queueName,
      async (job) => {
        const jobDef = jobs.jobs.find((j) => j.name === job.name);

        if (!jobDef) {
          throw new Error(`Unknown job name: ${job.name}`);
        }

        await jobDef.handler(job.data, jobCtx);
      },
      {
        connection,
        concurrency,
      }
    );

    workers.push(worker);

    worker.on('completed', (job: QueueJob) => {
      // eslint-disable-next-line no-console
      console.log(`[worker][${queueOpts.queueName}] completed: `, job.name, job.data.cid);
    });

    worker.on('failed', (job: QueueJob | undefined, err: Error) => {
      // eslint-disable-next-line no-console
      console.log(`[worker][${queueOpts.queueName}] failed: `, job?.name, job?.data.cid, err);
    });

    return worker;
  }

  async function pendingCount() {
    const counts = await queue.getJobCounts('delayed', 'active', 'waiting', 'waiting-children', 'prioritized');
    return Object.values(counts).reduce((acc, count) => acc + count, 0);
  }

  async function waitForIdle() {
    let pending = 0;
    do {
      pending = await pendingCount();
      // eslint-disable-next-line no-console
      console.log(`[queue][${queueOpts.queueName}] pending: ${pending}`);
      await new Promise((resolve) => setTimeout(resolve, 1500));
    } while (pending > 0);
  }

  async function close() {
    await Promise.all(workers.map((w) => w.close()));
    await queue.close();
  }

  return { queue, add, createBatch, createWorker, pendingCount, waitForIdle, close };
}
