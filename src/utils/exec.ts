import { exec } from "node:child_process";
import * as util from 'node:util';
export const execPromisified = util.promisify(exec);