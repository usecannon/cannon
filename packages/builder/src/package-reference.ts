interface PartialRefValues {
  name: string;
  version?: string;
  preset?: string;
}

/**
 * Used to format any reference to a cannon package and split it into it's core parts
 */
export class PackageReference {
  static DEFAULT_TAG = 'latest';
  static DEFAULT_PRESET = 'main';
  static PACKAGE_REGEX = /^(?<name>[a-z0-9][A-Za-z0-9-]{1,}[a-z0-9])(?::(?<version>[^@]+))?(@(?<preset>[^\s]{1,24}))?$/;
  static VARIANT_REGEX = /^(?<chainId>\d+)-(?<preset>[^\s]{1,24})$/;
  /**
   * Anything before the colon or an @ (if no version is present) is the package name.
   */
  name: string;
  /**
   *  Anything between the colon and the @ is the package version.
   *  Defaults to 'latest' if not specified in reference
   */
  version: string;
  /**
   * Anything after the @ is the package preset.
   */
  preset: string;

  /**
   * Convenience parameter for returning packageRef with interpolated version and preset like name:version@preset
   */
  get fullPackageRef() {
    const res = `${this.name}:${this.version}@${this.preset}`;
    if (!PackageReference.isValid(res)) throw new Error(`Invalid package reference "${res}"`);
    return res;
  }

  get packageRef() {
    const res = `${this.name}:${this.version}`;
    if (!PackageReference.isValid(res)) throw new Error(`Invalid package reference "${res}"`);
    return res;
  }

  /**
   * Parse package reference without normalizing it
   */
  static parse(ref: string) {
    const match = ref.match(PackageReference.PACKAGE_REGEX);

    if (!match || !match.groups?.name) {
      throw new Error(
        `Invalid package reference "${ref}". Should be of the format <package-name>:<version> or <package-name>:<version>@<preset>`
      );
    }

    const res: PartialRefValues = { name: match.groups.name };

    const nameSize = res.name.length;
    if (nameSize > 32) {
      throw new Error(`Package reference "${ref}" is too long. Package name exceeds 32 bytes`);
    }

    if (match.groups.version) res.version = match.groups.version;

    const versionSize = res.version?.length || 0;
    if (versionSize > 32) {
      throw new Error(`Package reference "${ref}" is too long. Package version exceeds 32 bytes`);
    }

    if (match.groups.preset) {
      res.preset = match.groups.preset;

      if (res.preset.length > 22) {
        throw new Error(`Package reference "${ref}" is too long. Package preset exceeds 22 bytes`);
      }
    }

    return res;
  }

  static isValid(ref: string) {
    try {
      PackageReference.parse(ref);
      return true;
    } catch (err) {
      return false;
    }
  }

  static from(name: string, version?: string, preset?: string) {
    version = version || PackageReference.DEFAULT_TAG;
    preset = preset || PackageReference.DEFAULT_PRESET;
    return new PackageReference(`${name}:${version}@${preset}`);
  }

  /**
   * Parse variant string into chainId and preset
   * @param variant string
   * @returns chainId and preset
   */
  static parseVariant(variant: string): [number, string] {
    const match = variant.match(PackageReference.VARIANT_REGEX);

    if (!match || !match.groups?.chainId || !match.groups?.preset) {
      throw new Error(`Invalid variant "${variant}". Should be of the format <chainId>-<preset>`);
    }

    return [Number(match.groups.chainId), match.groups.preset];
  }

  constructor(ref: string) {
    const parsed = PackageReference.parse(ref);
    const { name, version = PackageReference.DEFAULT_TAG, preset = PackageReference.DEFAULT_PRESET } = parsed;

    this.name = name;
    this.version = version;
    this.preset = preset;
  }
}
