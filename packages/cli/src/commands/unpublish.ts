import { CliSettings } from '../settings';

interface Params {
  cliSettings: CliSettings;
  options: any;
  packageRef: string;
  skipConfirm?: boolean;
}

export async function unpublish({ cliSettings, options, packageRef }: Params) {}
