import { CannonStorage, DeploymentInfo } from '@usecannon/builder';
import { readDeploy, readDeployRecursive } from './package'; // assuming the module's name is "module.ts"

jest.mock('@usecannon/builder');
jest.mock('fastq');
jest.mock('./registry');
jest.mock('./settings');
jest.mock('./loader');

describe('readDeploy', () => {
  it('should call the _readDeploy function', async () => {
    const packageRef = 'name:version@preset';
    const chainId = 1;

    const deployInfo: DeploymentInfo = {
      generator: 'cannon test',
      timestamp: 0,
      def: { name: 'mockName', version: '1.0.0' }, // Add properties based on your DeploymentInfo type
      options: {},
      state: {},
      meta: {},
      miscUrl: 'http://mock.url',
      chainId,
    };

    jest.spyOn(CannonStorage.prototype, 'readDeploy').mockResolvedValueOnce(deployInfo);

    const result = await readDeploy(packageRef, chainId);

    expect(CannonStorage.prototype.readDeploy).toHaveBeenCalledWith(packageRef, chainId);
    expect(result).toEqual(deployInfo);
  });
});

describe('readDeployRecursive', () => {
  it('should return a list of deployments', async () => {
    const packageRef = 'name:version@preset';
    const chainId = 1;

    const deployInfo: DeploymentInfo = {
      generator: 'cannon test',
      timestamp: 0,
      def: { name: 'mockName', version: '1.0.0' }, // Add properties based on your DeploymentInfo type
      options: {},
      state: {},
      meta: {},
      miscUrl: 'http://mock.url',
      chainId,
    };

    jest.spyOn(CannonStorage.prototype, 'readBlob').mockResolvedValueOnce(deployInfo);
    jest.spyOn(CannonStorage.prototype, 'readDeploy').mockResolvedValueOnce(deployInfo);
    jest.spyOn(Promise, 'all').mockResolvedValueOnce([]);

    const result = await readDeployRecursive(packageRef, chainId);

    expect(result).toContain(deployInfo);
  });
});
