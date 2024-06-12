const viem = require('viem');
const { optimism } = require('viem/chains');
const { privateKeyToAccount } = require('viem/accounts');

const {
  OptimismEmitter,
  SentMessageEvent,
  StoppedEvent,
} = require('./optimism_keeper');

const abi = require('./op-messanger-abi.json');

const L1CrossDomainMessengerAddress =
  '0x36BDE71C97B33Cc4729cf772aE268934f7AB70B2';

const L2CrossDomainMessenger = '0x4200000000000000000000000000000000000007';

const optimismForkProviderUrl = 'http://127.0.0.1:9546';

/*
 * This function sets up a test client impersonating the L1CrossDomainMessengerAddress
 */
const setupTestClient = async () => {
  const testClient = viem
    .createTestClient({
      mode: 'anvil',
      chain: optimism,
      transport: viem.http(optimismForkProviderUrl),
    })
    .extend(viem.publicActions)
    .extend(viem.walletActions);

  await testClient.impersonateAccount({
    address: L1CrossDomainMessengerAddress,
  });
  await testClient.setBalance({
    address: L1CrossDomainMessengerAddress,
    value: viem.parseEther('10000'),
  });

  return testClient;
};

/*
 * This function handles the SentMessage event and creates transaction data to relay the message
 */
const handleSentMessageEvent = (transactionDatas) => async (topic) => {
  transactionDatas.push({
    abi,
    account: L1CrossDomainMessengerAddress,
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
    const hash = await testClient.writeContract(request);

    console.log(`Transaction hash: ${hash}`);
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

  // wait 5 seconds to ensure all events are processed
  await new Promise((resolve) => setTimeout(resolve, 5000));

  await processTransactions(testClient, transactionDatas);
};

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
