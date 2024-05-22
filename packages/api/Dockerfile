FROM node:20-alpine AS build
WORKDIR /usr/app
COPY tsconfig.json package.json ./
RUN npm i
COPY ./src/ ./src/
RUN npm run build

FROM node:20-alpine
ENV NODE_ENV production
ENV REDIS_URL ""
ENV PORT 8080
EXPOSE ${PORT}
WORKDIR /usr/app
COPY --from=build /usr/app/dist dist
COPY --from=build /usr/app/package.json package.json
COPY --from=build /usr/app/package-lock.json package-lock.json
RUN npm install --omit=dev
CMD ["node", "dist/src/index.js"]
