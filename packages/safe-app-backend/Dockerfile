FROM node:22.11.0-alpine AS build

WORKDIR /usr/app

RUN npm i -g pnpm @vercel/ncc
COPY ./package.json ./tsconfig.json ./
RUN pnpm i
COPY ./src ./src
RUN pnpm run build
RUN ncc build ./src/index.ts -o ./dist
RUN echo $(node -p "require('./package.json').version") > /version.txt

FROM node:22.11.0-alpine

WORKDIR /usr/app

COPY --from=build /version.txt /version.txt
ARG VERSION=$(cat /version.txt)
ARG BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
ARG BUILD_REVISION=unknown

LABEL org.opencontainers.image.source="https://github.com/usecannon/cannon-safe-app-backend" \
      org.opencontainers.image.description="Replacement for safe transaction service that is extremely simple to use" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.title="Cannon Safe App Backend" \
      org.opencontainers.image.vendor="usecannon" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${BUILD_REVISION}" \
      org.opencontainers.image.documentation="https://github.com/usecannon/cannon-safe-app-backend"


ENV NODE_ENV=production
ENV PORT=8080
ENV BUILD_REVISION=${BUILD_REVISION}

EXPOSE ${PORT}

COPY --from=build /usr/app/dist .

CMD ["node", "index.js"]
