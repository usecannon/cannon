import path from 'node:path';
import { promises as fs } from 'node:fs';
import { compress, getContentCID } from '@usecannon/builder/dist/src/ipfs';
import { DeploymentInfo } from '@usecannon/builder';

export async function loadFixture(name: string) {
  const fixturesDir = path.resolve(__dirname, '..', 'fixtures');
  const file = `${name}.json`;
  const content: DeploymentInfo = await fs.readFile(path.join(fixturesDir, file)).then((buf) => JSON.parse(buf.toString()));
  const data = Buffer.from(compress(JSON.stringify(content)));
  const cid = await getContentCID(data);

  return { cid, content, data };
}
