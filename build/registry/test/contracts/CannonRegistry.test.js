var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { equal, deepEqual } from 'assert/strict';
import { ethers } from 'hardhat';
import assertRevert from '../helpers/assert-revert';
const toBytes32 = ethers.utils.formatBytes32String;
describe('CannonRegistry', function () {
    let CannonRegistry;
    let owner, user2, user3;
    before('identify signers', function () {
        return __awaiter(this, void 0, void 0, function* () {
            [owner, user2, user3] = yield ethers.getSigners();
        });
    });
    before('deploy contract', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const CannonRegistryFactory = yield ethers.getContractFactory('CannonRegistry');
            const Implementation = yield CannonRegistryFactory.deploy();
            yield Implementation.deployed();
            const ProxyFactory = yield ethers.getContractFactory('Proxy');
            const Proxy = yield ProxyFactory.deploy(Implementation.address);
            yield Proxy.deployed();
            CannonRegistry = (yield ethers.getContractAt('CannonRegistry', Proxy.address));
            const ownerAddress = yield owner.getAddress();
            yield CannonRegistry.nominateNewOwner(ownerAddress).then((tx) => tx.wait());
            yield CannonRegistry.acceptOwnership().then((tx) => tx.wait());
        });
    });
    describe('Upgradedability', function () {
        let newImplementation;
        before('deploy new implementation', function () {
            return __awaiter(this, void 0, void 0, function* () {
                const CannonRegistry = yield ethers.getContractFactory('CannonRegistry');
                newImplementation = (yield CannonRegistry.deploy());
                yield newImplementation.deployed();
            });
        });
        it('upgrades to a new implementation', function () {
            return __awaiter(this, void 0, void 0, function* () {
                const { address } = newImplementation;
                yield CannonRegistry.upgradeTo(address).then((tx) => tx.wait());
                equal(yield CannonRegistry.getImplementation(), newImplementation.address);
            });
        });
    });
    describe('validatePackageName()', function () {
        it('only allows lowercase letters, numbers, and dashes', function () {
            return __awaiter(this, void 0, void 0, function* () {
                equal(yield CannonRegistry.validatePackageName(toBytes32('some--mo-du9le')), true);
                equal(yield CannonRegistry.validatePackageName(toBytes32('some_-mo-du9le')), false);
                equal(yield CannonRegistry.validatePackageName(toBytes32('some--mo-du9lE')), false);
                equal(yield CannonRegistry.validatePackageName(toBytes32('some$module')), false);
            });
        });
        it('does not allow dash at beginning or end', function () {
            return __awaiter(this, void 0, void 0, function* () {
                equal(yield CannonRegistry.validatePackageName(toBytes32('some--module-')), false);
                equal(yield CannonRegistry.validatePackageName(toBytes32('-some--module')), false);
            });
        });
        it('enforces minimum length', function () {
            return __awaiter(this, void 0, void 0, function* () {
                const testName = 'abcdefghijk';
                const minLength = Number(yield CannonRegistry.MIN_PACKAGE_NAME_LENGTH());
                equal(yield CannonRegistry.validatePackageName(toBytes32(testName.slice(0, minLength))), true);
                equal(yield CannonRegistry.validatePackageName(toBytes32(testName.slice(0, minLength - 1))), false);
            });
        });
    });
    describe('publish()', function () {
        it('should not allow to publish empty url', function () {
            return __awaiter(this, void 0, void 0, function* () {
                yield assertRevert(() => __awaiter(this, void 0, void 0, function* () {
                    yield CannonRegistry.publish(toBytes32('some-module'), toBytes32('0.0.1'), [], '');
                }), 'InvalidUrl("")');
            });
        });
        it('should not allow invalid name', function () {
            return __awaiter(this, void 0, void 0, function* () {
                yield assertRevert(() => __awaiter(this, void 0, void 0, function* () {
                    yield CannonRegistry.publish(toBytes32('some-module-'), toBytes32('0.0.1'), [], 'ipfs://some-module-hash@0.0.1');
                }), 'InvalidName("0x736f6d652d6d6f64756c652d0000000000000000000000000000000000000000")');
            });
        });
        it('should not allow more than 5 tags', function () {
            return __awaiter(this, void 0, void 0, function* () {
                yield assertRevert(() => __awaiter(this, void 0, void 0, function* () {
                    yield CannonRegistry.publish(toBytes32('some-module'), toBytes32('0.0.1'), ['one', 'two', 'three', 'four', 'five', 'six'].map(toBytes32), 'ipfs://some-module-hash@0.0.1');
                }), 'TooManyTags()');
            });
        });
        it('should create the first package and assign the owner', function () {
            return __awaiter(this, void 0, void 0, function* () {
                const tx = yield CannonRegistry.connect(owner).publish(toBytes32('some-module'), toBytes32('0.0.1'), [], 'ipfs://some-module-hash@0.0.1');
                const { events } = yield tx.wait();
                equal(events.length, 1);
                equal(events[0].event, 'PackagePublish');
                const resultUrl = yield CannonRegistry.getPackageUrl(toBytes32('some-module'), toBytes32('0.0.1'));
                equal(resultUrl, 'ipfs://some-module-hash@0.0.1');
            });
        });
        it('should be able to publish new version', function () {
            return __awaiter(this, void 0, void 0, function* () {
                const tx = yield CannonRegistry.connect(owner).publish(toBytes32('some-module'), toBytes32('0.0.2'), [], 'ipfs://some-module-hash@0.0.2');
                const { events } = yield tx.wait();
                equal(events.length, 1);
                equal(events[0].event, 'PackagePublish');
            });
        });
        it('should be able to update an older version', function () {
            return __awaiter(this, void 0, void 0, function* () {
                const tx = yield CannonRegistry.connect(owner).publish(toBytes32('some-module'), toBytes32('0.0.1'), [], 'ipfs://updated-module-hash@0.0.1');
                const { events } = yield tx.wait();
                equal(events.length, 1);
                equal(events[0].event, 'PackagePublish');
            });
        });
        it('pushes tags', function () {
            return __awaiter(this, void 0, void 0, function* () {
                const tx = yield CannonRegistry.connect(owner).publish(toBytes32('some-module'), toBytes32('0.0.3'), ['latest', 'stable'].map(toBytes32), 'ipfs://updated-module-hash@0.0.3');
                const { events } = yield tx.wait();
                equal(events.length, 1);
                equal(events[0].event, 'PackagePublish');
                equal(yield CannonRegistry.getPackageUrl(toBytes32('some-module'), toBytes32('latest')), 'ipfs://updated-module-hash@0.0.3');
                equal(yield CannonRegistry.getPackageUrl(toBytes32('some-module'), toBytes32('stable')), 'ipfs://updated-module-hash@0.0.3');
            });
        });
        it('should not allow to modify package from another owner', function () {
            return __awaiter(this, void 0, void 0, function* () {
                yield assertRevert(() => __awaiter(this, void 0, void 0, function* () {
                    yield CannonRegistry.connect(user2).publish(toBytes32('some-module'), toBytes32('0.0.4'), [], 'ipfs://updated-module-hash@0.0.4');
                }), 'Unauthorized()');
            });
        });
    });
    describe('nominatePackageOwner()', function () {
        it('should not allow nomination from non-owner', function () {
            return __awaiter(this, void 0, void 0, function* () {
                yield assertRevert(() => __awaiter(this, void 0, void 0, function* () {
                    yield CannonRegistry.connect(user2).nominatePackageOwner(toBytes32('some-module'), yield user2.getAddress());
                }), 'Unauthorized()');
            });
        });
        it('nominates', function () {
            return __awaiter(this, void 0, void 0, function* () {
                yield CannonRegistry.connect(owner).nominatePackageOwner(toBytes32('some-module'), yield user2.getAddress());
                equal(yield CannonRegistry.getPackageNominatedOwner(toBytes32('some-module')), yield user2.getAddress());
            });
        });
    });
    describe('acceptPackageOwnership()', function () {
        before('nominate new owner', function () {
            return __awaiter(this, void 0, void 0, function* () {
                yield CannonRegistry.connect(owner).nominatePackageOwner(toBytes32('some-module'), yield user2.getAddress());
            });
        });
        it('only nominated owner can accept ownership', function () {
            return __awaiter(this, void 0, void 0, function* () {
                yield assertRevert(() => __awaiter(this, void 0, void 0, function* () {
                    yield CannonRegistry.connect(user3).acceptPackageOwnership(toBytes32('some-module'));
                }), 'Unauthorized()');
            });
        });
        it('accepts ownership', function () {
            return __awaiter(this, void 0, void 0, function* () {
                yield CannonRegistry.connect(user2).acceptPackageOwnership(toBytes32('some-module'));
            });
        });
    });
    describe('getPackageVersions()', function () {
        it('returns package versions', function () {
            return __awaiter(this, void 0, void 0, function* () {
                const result = yield CannonRegistry.getPackageVersions(toBytes32('some-module'));
                deepEqual(result, [
                    toBytes32('0.0.1'),
                    toBytes32('0.0.2'),
                    toBytes32('0.0.3'),
                    toBytes32('latest'),
                    toBytes32('stable'),
                ]);
            });
        });
    });
    describe('package verification', function () {
        it('does not allow to verify unexistant packages', function () {
            return __awaiter(this, void 0, void 0, function* () {
                yield assertRevert(() => __awaiter(this, void 0, void 0, function* () {
                    yield CannonRegistry.verifyPackage(toBytes32('invalid-package'));
                }), 'PackageNotFound()');
            });
        });
        it('does not allow to unverify unexistant packages', function () {
            return __awaiter(this, void 0, void 0, function* () {
                yield assertRevert(() => __awaiter(this, void 0, void 0, function* () {
                    yield CannonRegistry.unverifyPackage(toBytes32('invalid-package'));
                }), 'PackageNotFound()');
            });
        });
        it('emits a verification event', function () {
            return __awaiter(this, void 0, void 0, function* () {
                const tx = yield CannonRegistry.connect(user2).verifyPackage(toBytes32('some-module'));
                const { events } = yield tx.wait();
                equal(events.length, 1);
                const [{ event, args }] = events;
                equal(event, 'PackageVerify');
                equal(args.name, toBytes32('some-module'));
                equal(args.verifier, yield user2.getAddress());
            });
        });
        it('emits an unverification event', function () {
            return __awaiter(this, void 0, void 0, function* () {
                const tx = yield CannonRegistry.connect(user2).unverifyPackage(toBytes32('some-module'));
                const { events } = yield tx.wait();
                equal(events.length, 1);
                const [{ event, args }] = events;
                equal(event, 'PackageUnverify');
                equal(args.name, toBytes32('some-module'));
                equal(args.verifier, yield user2.getAddress());
            });
        });
    });
});
