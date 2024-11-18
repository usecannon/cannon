FROM node:22.11.0-alpine AS build

WORKDIR /usr/app

RUN npm i -g pnpm
COPY ./pnpm-workspace.yaml ./package.json ./pnpm-lock.yaml ./

COPY ./packages/repo/tsconfig.json ./packages/repo/package.json ./packages/repo/
RUN pnpm i --frozen-lockfile --no-optional -r --filter @usecannon/repo
COPY ./packages/repo/src/ ./packages/repo/src/
RUN pnpm run -r --filter @usecannon/repo build

FROM node:22.11.0-alpine

ENV NODE_ENV=production
ENV REDIS_URL=""
ENV PORT=8080

WORKDIR /usr/app

RUN npm i -g pnpm
COPY ./pnpm-workspace.yaml ./package.json ./pnpm-lock.yaml ./

COPY --from=build ./packages/repo/package.json ./packages/repo/tsconfig.json ./packages/repo/
RUN pnpm i --prod --frozen-lockfile --no-optional -r --filter @usecannon/repo

COPY --from=build ./packages/repo/dist ./packages/repo/dist

CMD ["node", "dist/src/index.js"]
