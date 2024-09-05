import Debug from 'debug';

/**
 * Sets the debug level based on the provided options.
 * @param opts Options to define debug level.
 */
export const setDebugLevel = (opts: any) => {
  switch (true) {
    case opts.Vvvv:
      Debug.enable('cannon:*');
      break;
    case opts.Vvv:
      Debug.enable('cannon:builder*');
      break;
    case opts.Vv:
      Debug.enable('cannon:builder,cannon:builder:definition');
      break;
    case opts.v:
      Debug.enable('cannon:builder');
      break;
  }
}
