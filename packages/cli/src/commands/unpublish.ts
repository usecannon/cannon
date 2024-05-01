import { CliSettings } from '../settings';

interface Params {
  cliSettings: CliSettings;
  options: any;
  packageRef: string;
}

export async function unpublish({ cliSettings, packageRef, options }: Params) {
  // noop
}
