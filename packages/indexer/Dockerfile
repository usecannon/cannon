FROM node:18-alpine AS base

# app envvars
ENV REDIS_URL="" IPFS_URL="" MAINNET_PROVIDER_URL=""

# pnpm envvars
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

COPY . /cannon

WORKDIR /cannon

FROM base AS prod-deps
# for some reason some packages require python and make (?) to finish their installation (?)
RUN apk update && apk add python3 build-base
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM base AS build
# for some reason some packages require python and make (?) to finish their installation (?)
RUN apk update && apk add python3 build-base
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run build
RUN cd packages/indexer && pnpm run build

FROM base
COPY --from=prod-deps /cannon/node_modules /cannon/node_modules
COPY --from=build /cannon/packages/builder/dist /cannon/packages/builder/dist
COPY --from=build /cannon/packages/cli/dist /cannon/packages/cli/dist
COPY --from=build /cannon/packages/indexer/dist /cannon/packages/indexer/dist
CMD ["node", "packages/indexer/dist/index.js"]
