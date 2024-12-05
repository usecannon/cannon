FROM node:18-alpine AS build
WORKDIR /app
ENV REDIS_URL ""
ENV IPFS_URL ""
ENV MAINNET_PROVIDER_URL ""
COPY --link . .
RUN npm i
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --link --from=build /app/dist dist
COPY --link --from=build /app/package.json package.json
COPY --link --from=build /app/package-lock.json package-lock.json
RUN npm install --omit=dev
CMD ["node", "dist/index.js"]
