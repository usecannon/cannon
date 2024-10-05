# Cannon Command Line Interface

## Install the CLI

Use npm to install the CLI:

```
npm i -g @usecannon/cli
```

## Run a Package

Run a package from [the registry](https://usecannon.com/search):

```
cannon greeter
```

## Run E2E Tests

We use bats as our main testing infrastructure for end-to-end tests. To run the e2e suite, just run the following command in your terminal:

```
pnpm run test-e2e
```

Note: if you're using MacOS, you will need to install parallel before running the E2E tests: https://www.gnu.org/software/parallel/

## Setup to Build

To deploy protocols and create your own packages (i.e. build Cannonfiles), first run the `setup` command:

```
cannon setup
```

See [the website](https://usecannon.com) for the _Getting Started_ guide, documentation, and more.
