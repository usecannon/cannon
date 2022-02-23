set -x
set -e

# ensure environment is clean
rm -rf cache

# run a build of the base cannonfile
DEBUG=cannon:* npx hardhat cannon:build

# run a build of the consumer cannonfile
DEBUG=cannon:* npx hardhat cannon:build --file cannonfile.consumer.toml

# test node provision
DEBUG=cannon:* npx hardhat cannon consumer:0.0.1 &

while true; do
	if curl http://localhost:8545/; then break; fi
	sleep 1;
done

#pkill node
