# Safe App Backend

This is effectively a replacement for the [safe-transaction-service](https://github.com/safe-global/safe-transaction-service) which only provides the required capability of accumulating signatures ready for execution. it is designed to be easy to run independently even if all you have is an rpc endpoint.

## How to use

After checking out the repo, install dependencies and build the project:

```
pnpm i
pnpm run build
```

Once the project is built, you can run it:

```
pnpm start
```

We also provide a docker image if you prefer:

```
docker run -it --rm ghcr.io/usecannon/safe-app-backend -e RPC_URLS=...
```

### Custom RPC endpoints

The `RPC_URLS` environment variable is an optional comma separated list of RPC
endpoints for the networks you wan't to include that are not listed by [viem](https://viem.sh/docs/chains/introduction.html).

```
RPC_URLS=https://mainnet.infura.io/abc123,https://optimism.infura.io/abc123 node dist/index.js
```
