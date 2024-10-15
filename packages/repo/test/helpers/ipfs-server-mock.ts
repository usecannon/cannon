import { createServer, IncomingMessage, ServerResponse, Server } from 'node:http';
import { after } from 'node:test';
import { promisify } from 'node:util';
import getPort from 'get-port';

const servers: Server[] = [];

after(async function () {
  await Promise.all(servers.map((server) => promisify(server.close.bind(server))()));
});

const handleRequest = (req: IncomingMessage, res: ServerResponse) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      data: 'Hello World!',
    })
  );
};

export async function ipfsServerMock() {
  const port = await getPort();

  const server = createServer(handleRequest);

  servers.push(server);

  server.listen(port);

  return { ipfsUrl: `http://127.0.0.1:${port}` };
}
