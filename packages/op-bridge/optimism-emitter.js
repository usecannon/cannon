const viem = require('viem');
const { mainnet } = require('viem/chains');
const EventEmitter = require('node:events');

const CrossDomainMessengerABI = require('./CrossDomainMessenger.json');

const L1CrossDomainMessenger = '0x25ace71c97B33Cc4729CF772ae268934F7ab5fA1';

const mainnetForkRpcUrl = 'http://127.0.0.1:9545';

const SentMessageEvent = 'SentMessage';
const StoppedEvent = 'Stopped';

class OptimismEmitter extends EventEmitter {
  constructor() {
    super();
    this.client = null;
    this.unwatch = null;
  }

  start() {
    const event = viem.getAbiItem({
      abi: CrossDomainMessengerABI,
      name: SentMessageEvent,
    });

    // create a public client, connected to anvil mainnet fork
    this.client = viem.createPublicClient({
      chain: mainnet,
      transport: viem.http(mainnetForkRpcUrl),
    });

    this.unwatch = this.client.watchEvent({
      address: L1CrossDomainMessenger,
      event,
      onLogs: async (logs) => {
        const topics = viem.parseEventLogs({
          abi: CrossDomainMessengerABI,
          eventName: SentMessageEvent,
          logs,
        });

        for (const topic of topics) {
          this.emit(SentMessageEvent, topic);
        }

        this.stop();
      },
      onError: (err) => {
        // unwatch the event
        if (this.unwatch) this.unwatch();
        // reject the promise
        reject(
          new Error(`Error watching for ${SentMessageEvent} event: ${err}`)
        );
      },
    });
  }

  stop() {
    if (this.unwatch) {
      this.unwatch();
      this.unwatch = null;

      this.emit(StoppedEvent);
    }
  }
}

module.exports = { OptimismEmitter, SentMessageEvent, StoppedEvent };
