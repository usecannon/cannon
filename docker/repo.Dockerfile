FROM node:22.11.0-alpine AS build

WORKDIR /usr/app

RUN npm i -g pnpm @vercel/ncc
COPY . .

RUN pnpm i --frozen-lockfile --no-optional

RUN pnpm run -r --filter @usecannon/builder build:node
RUN ncc build ./packages/repo/src/index.ts -o ./packages/repo/dist

RUN echo $(node -p "require('./packages/repo/package.json').version") > /version.txt

FROM node:22.11.0-alpine

WORKDIR /usr/app

COPY --from=build /version.txt /version.txt
ARG VERSION=$(cat /version.txt)
ARG BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
ARG BUILD_REVISION=unknown

LABEL org.opencontainers.image.source="https://github.com/usecannon/cannon" \
      org.opencontainers.image.description="Cannon IPFS Repo Service with Kubo interface for fetching and pinning cannon packages" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.title="Cannon IPFS Repo Service" \
      org.opencontainers.image.vendor="usecannon" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${BUILD_REVISION}" \
      org.opencontainers.image.documentation="https://github.com/usecannon/cannon/tree/main/packages/repo"

ENV NODE_ENV=production
ENV PORT=8080
ENV BUILD_REVISION=${BUILD_REVISION}

COPY --from=build /usr/app/packages/repo/dist .

CMD ["node", "index.js"]
