import {getFoundryOpts, getFoundryArtifact, buildContracts} from './foundry';
import * as helpers from './helpers';
import sinon from 'sinon';

import fs from 'fs-extra';

describe('getFoundryOpts', () => {
  it('should return the correct options', async () => {
    const execPromiseStub = sinon.stub(helpers, 'execPromise').resolves('{"src":"src","test":"test","script":"script","out":"out"}');

    const opts = await getFoundryOpts();
    expect(opts).toEqual({src: 'src', test: 'test', script: 'script', out: 'out'});

    execPromiseStub.restore();
  });
});

describe('buildContracts', () => {
  it('should call forge build', async () => {
    const execPromiseStub = sinon.stub(helpers, 'execPromise').resolves();

    await buildContracts();

    expect(execPromiseStub.calledWith('forge build')).toBe(true);

    execPromiseStub.restore();
  });
});

describe('getFoundryArtifact', () => {
  it('should return the correct artifact', async () => {
    const execPromiseStub = sinon.stub(helpers, 'execPromise');

    execPromiseStub.onCall(0).resolves('{"src":"src","test":"test","script":"script","out":"out"}');

    execPromiseStub.onCall(1).resolves(
      JSON.stringify({
        compiler: { version: '0.8.1' },
        sources: { 'test.sol': {} },
        settings: { optimizer: {}, remappings: {}, outputSelection: { '*': { '*': ['*'] } } }
      })
    );

    const readFileStub = sinon.stub(fs, 'readFile').resolves(Buffer.from(
      JSON.stringify({
        ast: { absolutePath: 'test.sol' },
        abi: [],
        bytecode: { object: '0x1234', linkReferences: {} },
        deployedBytecode: { object: '0x1234' },
      })
    ));

    const readFileSyncStub = sinon.stub(fs, 'readFileSync').returns('test contract');

    const artifact = await getFoundryArtifact('Test');

    expect(typeof artifact).toBe('object');
    expect(artifact).toHaveProperty('contractName');
    expect(artifact).toHaveProperty('sourceName');
    expect(artifact).toHaveProperty('abi');
    expect(artifact).toHaveProperty('bytecode');
    expect(artifact).toHaveProperty('deployedBytecode');
    expect(artifact).toHaveProperty('linkReferences');
    expect(artifact).toHaveProperty('source');

    execPromiseStub.restore();
    readFileStub.restore();
    readFileSyncStub.restore();
  });
});

