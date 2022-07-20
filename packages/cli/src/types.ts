export type PackageSettings = { [k: string]: string };

export interface PackageDefinition {
  name: string;
  version: string;
  settings: PackageSettings;
}
