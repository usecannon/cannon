# Cannon

Cannon is a Hardhat plug-in inspired by Docker and Terraform. **[Visit the website](https://usecannon.com)** for more information, including documentation. 

## Quick Start

1. Install the Hardhat plug-in
```bash
npm install hardhat-cannon
```

2. Add this to your hardhat.config.js
```js
require('hardhat-cannon');
```

3. Start a local chain with Synthetix
```bash
npx hardhat cannon synthetix:latest
```

[Browse packages](https://usecannon.com/search) for other protocols you can quickly deploy.

## Plug-in Development

This plug-in is based on the [Hardhat TypeScript plugin boilerplate](https://github.com/NomicFoundation/hardhat-ts-plugin-boilerplate). Review the README for some relevant information.

### Publishing the Package

With appropriate npm permissions, run the following commands:
```bash
npx lerna bootstrap
npx lerna publish patch
```