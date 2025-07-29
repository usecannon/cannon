import { TaploLsp } from '@taplo/lsp';
import { Environment } from '@taplo/core';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';

function lspEnvironment(): Environment {
  return {
    cwd: process.cwd,
    envVar: (name: string) => process.env[name],
    envVars: () => Object.entries(process.env).filter(v => v[1]) as [string, string][],
    findConfigFile: () => undefined,
    glob: () => [],
    isAbsolute: () => true,
    now: () => new Date(),
    readFile: async (f) => fs.readFileSync(f),
    writeFile: async (f, s) => fs.writeFileSync(f, s),
    stderr: process.stderr,
    stdErrAtty: () => process.stderr.isTTY,
    stdin: () => Promise.reject('not implemented'),
    stdout: process.stdout,
    urlToFilePath: (url: string) => url.slice("file://".length),
  };
}

export async function run() {
    const bus = new EventEmitter();
    const taploServer = await TaploLsp.initialize(lspEnvironment(), {
        onMessage: (msg) => {
            console.log('got response', msg.result);
            bus.emit('message', msg);
        }
    })

    const server = http.createServer((req: any, res: any) => {
    if (req.method === 'POST' && req.url === '/') {
        let body = '';
        req.on('data', (chunk: string) => {
        body += chunk;
        });
        req.on('end', () => {
        try {
            const request = JSON.parse(body);

            bus.once('message', (msg) => {
                // TODO: check to see that the ID of the incoming message matches the outgoing.
                // if it doesn't match, we should not send back this message
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(msg);
            });

            taploServer.send(request);

            if (request.method === 'initialize') {
                // ensure the cannon schema is associated
                console.log('associate cannon schema');
                taploServer.send({
                    jsonrpc: '2.0',
                    method: 'taplo/associatedSchema',
                    // use a remote URL to ensure we get the most up-to-date schema for cannon
                    params: [`https://raw.githubusercontent.com/usecannon/cannon/main/packages/lsp/src/schema.json`]
                })
            }
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' } }));
        }
        });
    } else {
        res.writeHead(404);
        res.end();
    }
    });

    server.listen(3000, () => {
    console.log('JSON-RPC server listening on port 3000');
    });
}

if (require.main === module) {
  run().catch((err) => {
    console.error('Failed to run LSP server:', err);
    process.exit(1);
  });
}
