/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

import type { Config } from "jest";

const config: Config = {
  preset: 'ts-jest',
  verbose: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8'
};

export default config;
