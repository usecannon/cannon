import _ from 'lodash';
import * as viem from 'viem';
import express from 'express';
import Redis from 'ioredis';
import morgan from 'morgan';
import * as viemChains from 'viem/chains';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import SafeABI from './abi/Safe.json';
import packageJson from '../package.json';

const port = Number.parseInt(process.env.PORT || '8080');

const chains = Object.values(viemChains);

type SafeTransaction = {
  to: string;
  value: string;
  data: string;
  operation: string;
  safeTxGas: string;
  baseGas: string;
  gasPrice: string;
  gasToken: string;
  refundReceiver: string;
  _nonce: number;
};

type StagedTransaction = {
  txn: SafeTransaction;
  sigs: string[];
  createdAt: number;
  updatedAt: number;
};

// arbitrary limits to harden the server a bit
const MAX_SIGS = 100;
const MAX_TXNS_STAGED = 100;
const MAX_TXDATA_SIZE = 1000000;

async function start() {
  const txdb = new Map<string, Map<string, StagedTransaction>>();
  const providers = new Map<number, viem.PublicClient>();

  const rdb: Redis | null = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;

  if (rdb) {
    rdb.on('ready', () => {
      console.log('connected to persistence backend');
    });

    rdb.on('error', (err) => {
      console.error('problem with persistence backend', err);
    });

    rdb.on('close', () => {
      console.error('persistence backend connection was closed');
      process.exit(1);
    });
  } else {
    console.log('warn: persistence is *NOT* enabled. To persist your safe transactions, please supply REDIS_URL.');
  }

  for (const rpcUrl of process.env.RPC_URLS?.split(',') || []) {
    const provider = viem.createPublicClient({ transport: viem.http(rpcUrl) });
    const chainId = await provider.getChainId();
    providers.set(Number(`${chainId}`), provider);
  }

  function getProvider(chainId: string | number | bigint) {
    const id = Number(`${chainId}`);
    const provider = providers.get(id);

    if (provider) return provider;

    const chain = chains.find((chain) => chain.id === id);
    if (!chain) return null;
    const rpcUrl = chain.rpcUrls.default.http[0];
    if (!rpcUrl) return null;

    const newProvider = viem.createPublicClient({ transport: viem.http(rpcUrl) });

    providers.set(id, newProvider);

    return newProvider;
  }

  function getSafeKey(chainId: number, safeAddress: string) {
    return `${chainId}-${safeAddress.toLowerCase()}`;
  }

  const app = express();

  if (process.env.TRUST_PROXY) {
    app.enable('trust proxy');
  }

  app.use(morgan('tiny'));
  app.use(express.json());
  app.use(helmet());

  app.get('/favicon.ico', (req, res) => res.status(204));

  app.use(
    rateLimit({
      windowMs: 1000,
      limit: 500,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      validate: { trustProxy: !!process.env.TRUST_PROXY },
    }),
  );

  app.use((_req, res, next) => {
    res.appendHeader('Access-Control-Allow-Origin', '*');
    res.appendHeader('Access-Control-Allow-Methods', '*');
    res.appendHeader('Access-Control-Allow-Headers', '*');
    next();
  });

  function parseSafeParams(params: { chainId: string; safeAddress: string }) {
    const chainId = Number.parseInt(params.chainId);
    if (!Number.isSafeInteger(chainId) || chainId < 1) return {};
    if (!viem.isAddress(params.safeAddress)) return {};
    const safeAddress = viem.getAddress(params.safeAddress.toLowerCase());
    return { chainId, safeAddress };
  }

  async function loadWithPersistenceFallback(chainId: number, safeAddress: string) {
    const k = getSafeKey(chainId, safeAddress);

    // if we dont have the data locally, see if it is on the (optional) persisted database
    if (!txdb.has(k) && rdb) {
      const rawRedisTxs = await rdb.get('safe-app-backend:' + getSafeKey(chainId, safeAddress));
      if (rawRedisTxs) {
        const loadedMap = new Map();
        for (const [k, v] of JSON.parse(rawRedisTxs)) {
          loadedMap.set(k, v);
        }
        txdb.set(k, loadedMap);
      }
    }

    return txdb.get(k);
  }

  app.get('/:chainId/:safeAddress', async (req, res) => {
    const { chainId, safeAddress } = parseSafeParams(req.params);

    const dbTxs = (await loadWithPersistenceFallback(chainId!, safeAddress!))?.values();

    res.send(_.sortBy(Array.from(dbTxs ?? []), (t) => t.txn._nonce));
  });

  app.post('/:chainId/:safeAddress', async (req, res) => {
    const { chainId, safeAddress } = parseSafeParams(req.params);

    if (!chainId || !safeAddress) {
      return res.status(400).send('invalid chain id or safe address');
    }

    if (JSON.stringify(req.body).length > MAX_TXDATA_SIZE) {
      return res.status(400).send('txn too large');
    }

    try {
      const signedTransactionInfo: StagedTransaction = _.pick(req.body, ['txn', 'sigs', 'createdAt', 'updatedAt']);
      const provider = getProvider(chainId);

      if (!provider) {
        return res.status(400).send('chain id not supported');
      }

      //const safe = new ethers.Contract(safeAddress, SafeABI, provider);

      const txs = (await loadWithPersistenceFallback(chainId, safeAddress)) || new Map();

      // verify all sigs are valid
      const digest = (await provider.readContract({
        abi: SafeABI,
        address: safeAddress,
        functionName: 'getTransactionHash',
        args: [
          signedTransactionInfo.txn.to,
          signedTransactionInfo.txn.value,
          signedTransactionInfo.txn.data,
          signedTransactionInfo.txn.operation,
          signedTransactionInfo.txn.safeTxGas,
          signedTransactionInfo.txn.baseGas,
          signedTransactionInfo.txn.gasPrice,
          signedTransactionInfo.txn.gasToken,
          signedTransactionInfo.txn.refundReceiver,
          signedTransactionInfo.txn._nonce,
        ],
      })) as viem.Hash;

      //const digest = viem.keccak256(hashData);

      const existingTx = txs.get(digest);

      const currentNonce = (await provider.readContract({
        abi: SafeABI,
        address: safeAddress,
        functionName: 'nonce',
      })) as bigint;

      if (!existingTx) {
        signedTransactionInfo.createdAt = Date.now();
        signedTransactionInfo.updatedAt = signedTransactionInfo.createdAt;

        if (txs.size > MAX_TXNS_STAGED) {
          return res.status(400).send('maximum staged signatures for this safe');
        }
        // verify the new txn will work on what we know about the safe right now

        if (signedTransactionInfo.txn._nonce < currentNonce) {
          return res.status(400).send('proposed nonce is lower than current safe nonce');
        }

        if (
          signedTransactionInfo.txn._nonce > currentNonce &&
          !Array.from(txs.values()).find((tx) => tx.txn._nonce === signedTransactionInfo.txn._nonce - 1)
        ) {
          return res.status(400).send('proposed nonce is higher than current safe nonce with missing staged');
        }
      } else {
        signedTransactionInfo.createdAt = existingTx.createdAt || Date.now();
        signedTransactionInfo.updatedAt = Date.now();

        let recoveredSigAddresses = [];
        for (const sig of _.union(signedTransactionInfo.sigs, existingTx.sigs)) {
          const signatureBytes = viem.toBytes(sig);

          // for some reason its often necessary to adjust the version field -4 if its above 30
          /*if (_.last(signatureBytes)! > 30) {
            signatureBytes[signatureBytes.length - 1] -= 4;
          }*/

          const address = (
            await viem.recoverAddress({ hash: viem.toBytes(digest), signature: viem.toHex(signatureBytes) })
          ).toLowerCase();
          recoveredSigAddresses.push({
            sig,
            address,
          });
        }

        // its possible if two or more people sign transactions at the same time, they will have separate lists, and so they need to be merged together.
        // we also sort the signatures for the user here so that isnt a requirement when submitting signatures to this service
        signedTransactionInfo.sigs = _.sortBy(recoveredSigAddresses, ({ address }) => address).map((v) => v.sig);

        if (signedTransactionInfo.sigs.length > MAX_SIGS) {
          return res.status(400).send('maximum signatures reached for transaction');
        }
      }

      try {
        await provider.readContract({
          abi: SafeABI,
          address: safeAddress,
          functionName: 'checkNSignatures',
          args: [digest, '0x', viem.concat(signedTransactionInfo.sigs as viem.Hex[]), signedTransactionInfo.sigs.length],
        });
      } catch (err) {
        console.log('failed checking n signatures', err);
        return res.status(400).send('invalid signature');
      }

      txs.set(digest, signedTransactionInfo);

      // briefly clean up any txns that are less than current nonce, and any transactions with dup hashes to this one
      for (const [h, t] of txs.entries()) {
        if (t.txn._nonce < currentNonce || (t !== signedTransactionInfo && _.isEqual(t.txn, signedTransactionInfo.txn))) {
          txs.delete(h);
        }
      }

      txdb.set(getSafeKey(chainId, safeAddress), txs);

      // save a copy on the (optional) persisted database
      if (rdb) {
        const key = `safe-app-backend:${getSafeKey(chainId, safeAddress)}`;
        rdb
          .set(key, JSON.stringify(Array.from(txs.entries())))
          .then(_.noop)
          .catch((e) => {
            console.error('problem when persisting safe txdb', e);
          });
      }

      res.send(_.sortBy(Array.from(txs.values()), (t) => t._nonce));
    } catch (err) {
      console.error('caught failure in transaction post', err);
      res.status(500).end('unexpected error, please check server logs');
    }
  });

  let _healthChecking = false;
  app.get('/health', async (_, res) => {
    if (_healthChecking) {
      return res.status(503).json({ status: 'error' });
    }

    _healthChecking = true;

    try {
      // Check Redis connection
      if (rdb) await rdb.ping();

      res.json({
        status: 'ok',
        version: packageJson.version,
      });
    } catch (err) {
      console.error('health check failed', err);
      res.status(503).json({ status: 'error' });
    } finally {
      setTimeout(() => {
        _healthChecking = false;
      }, 100);
    }
  });

  app.listen(port, () => {
    console.log(`\n · status: running · version: ${packageJson.version} · port: ${port} ·\n`);

    if (providers.size > 0) {
      console.log('   - registered rpcs:', Array.from(providers.keys()).join(' '));
    }
  });
}

start();
