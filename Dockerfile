FROM node:18-alpine AS build
WORKDIR /app
ENV REDIS_URL ""
ENV IPFS_URL ""
ENV MAINNET_PROVIDER_URL ""
RUN apk update && apk add build-base
COPY --link . .
RUN npm i -g pnpm
RUN pnpm i
RUN pnpm run build

FROM node:18-alpine
WORKDIR /app
COPY --link --from=build /app/packages/*/dist dist
COPY --link --from=build /app/package.json package.json
COPY --link --from=build /app/pnpm-lock.json pnpm-lock.json
RUN npm i -g pnpm
RUN pnpm install --omit=dev
CMD ["node", "packages/indexer/dist/index.js"]
