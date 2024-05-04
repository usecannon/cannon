import { cleanEnv, EnvError, makeValidator, str } from 'envalid';

const int = makeValidator<number>((input: string) => {
  const coerced = Number.parseInt(input, 10);

  if (!Number.isSafeInteger(coerced) || coerced < 1) {
    throw new EnvError(`Invalid integer input: "${input}"`);
  }

  return coerced;
});

export const config = cleanEnv(process.env, {
  PORT: int({ default: 8080 }),
  REDIS_URL: str({ devDefault: 'redis://localhost:6379' }),
  NODE_ENV: str({ choices: ['development', 'test', 'production', 'staging'], default: 'production' }),
  METRICS_USER: str({ devDefault: 'admin' }),
  METRICS_PASSWORD: str({ devDefault: 'admin' }),
});
