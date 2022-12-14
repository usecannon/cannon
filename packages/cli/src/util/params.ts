import _ from 'lodash';
import { InvalidArgumentError } from 'commander';
import { PackageSpecification, PackageSettings } from '../types';
import { CannonWrapperGenericProvider } from '@usecannon/builder';
import { ethers } from 'ethers';

const packageRegExp = /^(?<name>@?[a-z0-9][a-z0-9-]+[a-z0-9])(?::(?<version>.+))?$/;
const settingRegExp = /^(?<key>[a-z0-9-_]+)=(?<value>.*)$/i;

export function parsePackageRef(val: string) {
  const match = val.match(packageRegExp);

  if (!match) {
    throw new InvalidArgumentError(`Invalid package name "${val}". Should be of the format <package-name>:<version>`);
  }

  const { name, version = 'latest' } = match.groups!;

  return { name, version };
}

export function parseInteger(val: string) {
  const parsedValue = Number.parseInt(val);

  if (Number.isNaN(parsedValue)) {
    throw new InvalidArgumentError(`Invalid number "${val}"`);
  }

  return parsedValue;
}

export function parseSettings(values: string[] = []) {
  const settings: PackageSettings = {};

  for (const val of values) {
    const settingMatch = val.match(settingRegExp);

    if (!settingMatch) {
      throw new InvalidArgumentError(`Invalid custom setting given ${val}`);
    }

    const { key, value } = settingMatch.groups!;
    settings[key] = value;
  }

  return settings;
}

export function parsePackageArguments(val: string, result?: PackageSpecification): PackageSpecification {
  const packageMatch = val.match(packageRegExp);

  if (!result && !packageMatch) {
    throw new InvalidArgumentError('First argument should be a cannon package name, e.g.: greeter:1.0.0');
  }

  if (result && !_.isEmpty(result) && packageMatch) {
    throw new InvalidArgumentError('You can only specify a single cannon package');
  }

  if (packageMatch) {
    const { name, version = 'latest' } = packageMatch.groups!;

    const def = {
      name,
      version,
      settings: {},
    };

    return def;
  }

  const settingMatch = val.match(settingRegExp);
  if (settingMatch) {
    const { key, value } = settingMatch.groups!;
    result!.settings[key] = value;
    return result!;
  }

  throw new InvalidArgumentError(`Invalid argument given ${val}`);
}

export function parsePackagesArguments(val: string, result: PackageSpecification[] = []) {
  const packageMatch = val.match(packageRegExp);
  if (packageMatch) {
    const { name, version = 'latest' } = packageMatch.groups!;

    const def = {
      name,
      version,
      settings: {},
    };

    result.push(def);

    return result;
  }

  const settingMatch = val.match(settingRegExp);
  if (settingMatch) {
    if (!result.length) throw new InvalidArgumentError('Missing package definition before setting');
    const { key, value } = settingMatch.groups!;
    const def = result[result.length - 1];
    def.settings[key] = value;
    return result;
  }

  throw new InvalidArgumentError(`Invalid argument given ${val}`);
}

export function createSigners(
  provider: CannonWrapperGenericProvider,
  options: { privateKey?: string; mnemonic?: string; impersonate?: string }
): ethers.Signer[] {
  const signers: ethers.Signer[] = [];

  if (options.privateKey) {
    if (options.privateKey.includes(',')) {
      for (const pkey in options.privateKey.split(',')) {
        signers.push(new ethers.Wallet(pkey, provider));
      }
    } else {
      signers.push(new ethers.Wallet(options.privateKey, provider));
    }
  } else if (options.mnemonic) {
    for (let i = 0; i < 10; i++) {
      signers.push(ethers.Wallet.fromMnemonic(options.mnemonic, `m/44'/60'/0'/0/${i}`).connect(provider));
    }
  } else if (options.impersonate) {
    signers.push(provider.getSigner(options.impersonate));
  }

  return signers;
}
