import { getFoundryOpts, getFoundryArtifact, buildContracts } from './foundry';
import * as helpers from './helpers';

import fs from 'fs-extra';
import { glob } from 'glob';

jest.mock('./helpers');
jest.mock('fs-extra');
jest.mock('glob');

describe('getFoundryOpts', () => {
  it('should return the correct options', async () => {
    jest.mocked(helpers.execPromise).mockResolvedValue('{"src":"src","test":"test","script":"script","out":"out"}');

    const opts = await getFoundryOpts();
    expect(opts).toEqual({ src: 'src', test: 'test', script: 'script', out: 'out' });
  });
});

describe('buildContracts', () => {
  it('should call forge build', async () => {
    jest.mock('./helpers');

    await buildContracts();

    expect(helpers.execPromise).toHaveBeenCalledWith('forge build');
  });
});

describe('getFoundryArtifact', () => {
  it('should return the correct artifact', async () => {
    jest.mocked(glob).mockResolvedValueOnce(['out/Test.json']);

    jest
      .mocked(helpers.execPromise)
      .mockResolvedValueOnce('{"src":"src","test":"test","script":"script","out":"out"}')
      .mockResolvedValueOnce(
        JSON.stringify({
          compiler: { version: '0.8.1' },
          sources: { 'test.sol': {} },
          settings: { optimizer: {}, remappings: {}, outputSelection: { '*': { '*': ['*'] } } },
        })
      );

    jest.mocked(fs.readFile).mockResolvedValue(
      Buffer.from(
        JSON.stringify({
          metadata: {
            compiler: { version: '0.8.1' },
            sources: { 'test.sol': {} },
            settings: { optimizer: {}, remappings: {}, outputSelection: { '*': { '*': ['*'] } } },
          },
          ast: { absolutePath: 'test.sol' },
          abi: [],
          bytecode: { object: '0x1234', linkReferences: {} },
          deployedBytecode: { object: '0x1234' },
        })
        // casting to as never here because the types for fs-extra seem to be borked up atm (they partially inherit from node types, which breaks everything)
      ) as never
    );

    jest.mocked(fs.readFileSync).mockReturnValue('test contract');

    const artifact = await getFoundryArtifact('Test');

    expect(typeof artifact).toBe('object');
    expect(artifact).toHaveProperty('contractName');
    expect(artifact).toHaveProperty('sourceName');
    expect(artifact).toHaveProperty('abi');
    expect(artifact).toHaveProperty('bytecode');
    expect(artifact).toHaveProperty('deployedBytecode');
    expect(artifact).toHaveProperty('linkReferences');
    expect(artifact).toHaveProperty('source');
  });
});
