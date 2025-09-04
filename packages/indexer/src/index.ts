import { loop as registryLoop } from './registry';
import { loop as signatureDirectoryLoop } from './4byte-directory';
export * from './db';

void registryLoop();
void signatureDirectoryLoop();
