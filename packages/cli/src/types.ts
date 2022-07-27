export interface PackageDefinition {
  name: string;
  version: string;
  settings: { [k: string]: string };
}
