const stepNameRegex = /^[a-z0-9_-]+$/i;
export function isStepName(stepName: any) {
  return typeof stepName === 'string' && stepNameRegex.test(stepName);
}

const stepPathRegex = /^[a-z0-9_-]+(\.[a-z0-9_-]+)+$/i;
export function isStepPath(stepPath: any) {
  return typeof stepPath === 'string' && stepPathRegex.test(stepPath);
}
