import { log, warn } from 'console';
import { yellowBright, bold } from 'chalk';
import * as _ from 'lodash';

export const deprecatedWarn = _.once((deprecatedFlag: string, newFlag: string) => {
  log();
  warn(yellowBright(bold(`⚠️ The ${deprecatedFlag} option will be deprecated soon. Use ${newFlag} instead.`)));
  log();
});
