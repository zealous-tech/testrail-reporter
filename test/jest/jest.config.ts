/** @jest-config-loader ts-node */
// or
/** @jest-config-loader esbuild-register */

import type {Config} from 'jest';

const config: Config = {
  verbose: true,
  reporters: [
    "default",
    "../../index.js"
  ] 
  
};

export default config;