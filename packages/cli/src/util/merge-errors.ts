export function mergeErrors(err: Error, cause: Error) {
  const merged = new Error(err.message + '\n\n' + cause.message);
  merged.stack = merged.toString() + '\n' + _getErrorStack(cause) + '\n' + _getErrorStack(err);
  return merged;
}

function _getErrorStack(err: Error) {
  const messageLength = err.toString().length;
  return err.stack?.slice(messageLength + 1);
}
