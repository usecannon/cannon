/**
 * Gets all global variables from various JavaScript environments
 * @returns Set of all discoverable globals
 */
export function getGlobalVars(): Set<string> {
  const globals = new Set<string>();

  // Helper to safely get all properties from an object and its prototype chain
  const getAllPropertiesFromObject = (obj: any) => {
    while (obj) {
      try {
        Object.getOwnPropertyNames(obj).forEach((prop) => globals.add(prop));
        obj = Object.getPrototypeOf(obj);
      } catch (e) {
        break; // Stop if we can't access further
      }
    }
  };

  // Check globalThis
  getAllPropertiesFromObject(globalThis);

  // Check window in browser environment
  if (typeof window !== 'undefined') {
    getAllPropertiesFromObject(window);
  }

  // Check global in Node.js environment
  if (typeof global !== 'undefined') {
    getAllPropertiesFromObject(global);
  }

  // Check self (used in Web Workers)
  if (typeof self !== 'undefined') {
    getAllPropertiesFromObject(self);
  }

  // Get properties from Function constructor
  try {
    const functionProps = new Function('return Object.getOwnPropertyNames(this)')();
    functionProps.forEach((prop: string) => globals.add(prop));
  } catch (e) {
    // Ignore if blocked
  }

  return globals;
}
