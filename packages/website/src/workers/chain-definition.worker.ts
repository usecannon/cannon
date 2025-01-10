import { ChainDefinition } from '@usecannon/builder';

self.onmessage = (event) => {
  try {
    if (!event.data) {
      throw new Error('No chain definition data provided');
    }

    const def = new ChainDefinition(event.data);
    if (!def) {
      throw new Error('Failed to create chain definition');
    }

    // Initialize dependencies
    def.initializeComputedDependencies();

    // Send back only the necessary data
    self.postMessage(def);
  } catch (error: any) {
    self.postMessage({ error: error.message });
  }
};
