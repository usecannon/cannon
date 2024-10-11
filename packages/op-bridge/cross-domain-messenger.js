const viem = require('viem');
const { optimism } = require('viem/chains');

const {
  OptimismEmitter,
  SentMessageEvent,
  StoppedEvent,
} = require('./optimism-emitter');

const CrossDomainMessengerABI = require('./CrossDomainMessenger.json');

const L1CrossDomainMessenger = '0x36BDE71C97B33Cc4729cf772aE268934f7AB70B2';
const L2CrossDomainMessenger = '0x4200000000000000000000000000000000000007';

const optimismForkRpcUrl = 'http://127.0.0.1:9546';

/*
 * This function sets up a test client impersonating the L1CrossDomainMessengerAddress
 */
const setupTestClient = async () => {
  const testClient = viem
    .createTestClient({
      mode: 'anvil',
      chain: optimism,
      transport: viem.http(optimismForkRpcUrl),
    })
    .extend(viem.publicActions)
    .extend(viem.walletActions);

  await testClient.impersonateAccount({
    address: L1CrossDomainMessenger,
  });
  await testClient.setBalance({
    address: L1CrossDomainMessenger,
    value: viem.parseEther('420'),
  });

  return testClient;
};

/*
 * This function handles the SentMessage event and creates transaction data to relay the message
 */
const handleSentMessageEvent = (transactionDatas) => (topic) => {
  transactionDatas.push({
    abi: CrossDomainMessengerABI,
    account: L1CrossDomainMessenger,
    address: L2CrossDomainMessenger,
    functionName: 'relayMessage',
    args: [
      topic.args.messageNonce,
      topic.args.sender,
      topic.args.target,
      BigInt(0),
      topic.args.gasLimit,
      topic.args.message,
    ],
  });
};

/*
 * This function executes the transactions
 */
const processTransactions = async (testClient, transactionDatas) => {
  for (const transactionData of transactionDatas) {
    const { request } = await testClient.simulateContract(transactionData);

    // hardcode gas limit to 2.5M wei
    request.gas = BigInt(2_500_000);

    await testClient.writeContract(request);
  }
};

/*
 * Main function
 */
const main = async () => {
  // create event emitter
  const OPEmitter = new OptimismEmitter();

  // create test client
  const testClient = await setupTestClient();

  const transactionDatas = [];

  // start listening for events
  OPEmitter.start();

  OPEmitter.on(SentMessageEvent, handleSentMessageEvent(transactionDatas));

  await new Promise((resolve) => OPEmitter.on(StoppedEvent, resolve));

  await processTransactions(testClient, transactionDatas);
};

main()
  .then(() => process.exit(0))
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
