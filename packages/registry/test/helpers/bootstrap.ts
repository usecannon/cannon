import { ethers } from 'hardhat';

export async function bootstrap() {
  const [MockOPSendBridge, MockOPRecvBridge, MockERC20] = await Promise.all([
    _deployMockOptimismBridge(),
    _deployMockOptimismBridge(),
    _deployMockErc20(),
  ]);

  const { chainId } = await ethers.provider.getNetwork();
  const [Implementation, SubscriptionContract] = await deployCannonRegistry(
    MockERC20.address,
    '0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f',
    MockOPSendBridge.address,
    MockOPRecvBridge.address,
    chainId,
  );
  const Proxy = await _deployProxy(Implementation.address);
  const CannonRegistry = await ethers.getContractAt('CannonRegistry', Proxy.address);
  const CannonSubscription = await ethers.getContractAt('CannonSubscription', SubscriptionContract.address);

  return {
    MockOPSendBridge,
    MockOPRecvBridge,
    MockERC20,
    CannonSubscription,
    CannonRegistry,
  };
}

async function _deployMockOptimismBridge() {
  const factory = await ethers.getContractFactory('MockOptimismBridge');
  const contract = await factory.deploy();
  await contract.deployed();
  return contract;
}

async function _deployMockErc20() {
  const factory = await ethers.getContractFactory('MockERC20');
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
  paymentTokenAddress: string,
  vaultAddress: string,
  optimismMessengerAddress: string,
  optimismReceiverAddress: string,
  chainId: number,
) {
  const subscriptionFactory = await ethers.getContractFactory('CannonSubscription');
  const subscriptionContract = await subscriptionFactory.deploy(paymentTokenAddress, vaultAddress);
  await subscriptionContract.deployed();

  // register a couple plans which will be nice to have around later
  await subscriptionContract.registerPlan(86400, 10, 1, 30, 100, false);
  await subscriptionContract.registerPlan(43200, 5, 1, 90, 50, false);

  const factory = await ethers.getContractFactory('CannonRegistry');
  const contract = await factory.deploy(
    optimismMessengerAddress,
    optimismReceiverAddress,
    chainId,
    subscriptionContract.address,
  );
  await contract.deployed();

  return [contract, subscriptionContract];
}
