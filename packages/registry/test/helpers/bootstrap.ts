import { ethers } from 'hardhat';

export async function bootstrap() {
  const [MockOPSendBridge, MockOPRecvBridge] = await Promise.all([_deployMockOptimismBridge(), _deployMockOptimismBridge()]);

  const { chainId } = await ethers.provider.getNetwork();
  const Implementation = await deployCannonRegistry(MockOPSendBridge.address, MockOPRecvBridge.address, chainId);
  const Proxy = await _deployProxy(Implementation.address);
  const CannonRegistry = await ethers.getContractAt('CannonRegistry', Proxy.address);

  return {
    MockOPSendBridge,
    MockOPRecvBridge,
    CannonRegistry,
  };
}

async function _deployMockOptimismBridge() {
  const factory = await ethers.getContractFactory('MockOptimismBridge');
  const contract = await factory.deploy();
  await contract.deployed();
  return contract;
}

async function _deployProxy(implementationAddress: string) {
  const [owner] = await ethers.getSigners();
  const factory = await ethers.getContractFactory('Proxy');
  const contract = await factory.deploy(implementationAddress, await owner.getAddress());
  await contract.deployed();
  return contract;
}

export async function deployCannonRegistry(
  optimismMessengerAddress: string,
  optimismReceiverAddress: string,
  chainId: number
) {
  const subscriptionLibraryFactory = await ethers.getContractFactory('Subscription');
  const subscriptionLibrary = await subscriptionLibraryFactory.deploy();
  await subscriptionLibrary.deployed();

  const factory = await ethers.getContractFactory('CannonRegistry');
  const contract = await factory.deploy(optimismMessengerAddress, optimismReceiverAddress, chainId);
  await contract.deployed();
  return contract;
}
