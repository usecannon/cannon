set -x
set -e

# ensure environment is clean
rm -rf cache

# ensure sources are built
npx hardhat compile

# run a build of the base cannonfile
DEBUG=cannon:* npx hardhat cannon:build

# run a build of the consumer cannonfile
DEBUG=cannon:* npx hardhat cannon:build --file cannonfile.consumer.toml
