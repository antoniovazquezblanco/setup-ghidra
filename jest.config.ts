// SPDX-FileCopyrightText: 2026 Antonio Vázquez Blanco
// SPDX-License-Identifier: MIT

/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest/presets/default-esm",
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  setupFiles: ["<rootDir>/jest.setup.ts"],
  verbose: true,
  collectCoverage: true,
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.test.ts",
    // The entrypoint runs on import; the v8 provider would execute it.
    "!src/setup-ghidra.ts",
  ],
  coverageDirectory: "coverage",
  // Cobertura is what GitHub Code Quality ingests.
  coverageReporters: ["text", "cobertura"],
  coverageProvider: "v8",
};

export default config;
