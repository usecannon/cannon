import fs from 'fs';
import path from 'path';

export default class CannonRegistry {
  file = path.join(process.cwd(), 'cannon-registry.json');

  constructor(file?: string) {
    if (file) {
      this.file = file;
    }

    if (!fs.existsSync(this.file)) {
      fs.writeFileSync(this.file, '{}');
    }
  }

  async get(repository: string, tag: string) {
    const data = JSON.parse(fs.readFileSync(this.file).toString());
    return data?.[repository]?.[tag];
  }

  async set(repository: string, tag: string, value: string) {
    const data = JSON.parse(fs.readFileSync(this.file).toString());

    if (!data[repository]) data[repository] = {};

    data[repository][tag] = value;

    fs.writeFileSync(this.file, JSON.stringify(data, null, 2));
  }
}
