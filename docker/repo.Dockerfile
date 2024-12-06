FROM node:22.11.0-alpine AS build

WORKDIR /usr/app

RUN npm i -g pnpm @vercel/ncc
COPY ./pnpm-workspace.yaml ./package.json ./pnpm-lock.yaml ./
COPY ./packages/builder/package.json ./packages/builder/tsconfig.json ./packages/builder/tsconfig.build.json ./packages/builder/
COPY ./packages/repo/package.json ./packages/repo/tsconfig.json ./packages/repo/

RUN pnpm i --frozen-lockfile --no-optional -r --filter @usecannon/builder --filter @usecannon/repo
COPY ./packages/builder/ ./packages/builder/
COPY ./packages/repo/ ./packages/repo/

RUN pnpm run -r --filter @usecannon/builder build:node
RUN ncc build ./packages/repo/src/index.ts -o ./packages/repo/dist

FROM node:22.11.0-alpine

ENV NODE_ENV=production
ENV PORT=8080

WORKDIR /usr/app

COPY --from=build /usr/app/packages/repo/dist .

CMD ["node", "index.js"]
