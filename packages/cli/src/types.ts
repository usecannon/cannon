export type PackageSettings = { [k: string]: string };

export interface PackageSpecification {
  name: string;
  version: string;
  preset?: string;
  settings: PackageSettings;
}
