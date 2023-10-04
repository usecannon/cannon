import _ from 'lodash';
import { InvalidArgumentError } from 'commander';
import { PackageSpecification, PackageSettings } from '../types';
import { PackageReference } from '@usecannon/builder';

const settingRegExp = /^(?<key>[a-z0-9-_]+)=(?<value>.*)$/i;

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
  const packageMatch= PackageReference.isValid(val);

  if (!result && !packageMatch) {
    throw new InvalidArgumentError(
      'First argument should be a cannon package name, e.g.: greeter:1.0.0 or greeter:latest@main'
    );
  }

  if (result && !_.isEmpty(result) && packageMatch) {
    throw new InvalidArgumentError('You can only specify a single cannon package');
  }

  if (packageMatch) {
    const pkg = new PackageReference(val);

    if (!_.isEmpty(result)) {
      throw new InvalidArgumentError('You can only specify a single cannon package');
    }

    const { name, version, preset } = pkg;

    const def = {
      name,
      version,
      preset,
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
  const packageMatch = PackageReference.isValid(val);

  if (packageMatch) {
    const pkg = new PackageReference(val);
    const { name, version, preset } = pkg;

    const def = {
      name,
      version,
      preset,
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
