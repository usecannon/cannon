import { ChainDefinition } from '@usecannon/builder';

self.onmessage = (event) => {
  try {
    // Validate input data exists
    if (!event.data) {
      throw new Error('No chain definition data provided');
    }

    const def = new ChainDefinition(event.data);
    if (!def) {
      throw new Error('Failed to create chain definition');
    }

    // Return the chain definition
    self.postMessage(def);
  } catch (error: any) {
    self.postMessage({ error: error.message });
  }
};
