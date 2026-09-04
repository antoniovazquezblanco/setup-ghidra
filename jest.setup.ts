// SPDX-FileCopyrightText: 2026 Antonio Vázquez Blanco
// SPDX-License-Identifier: MIT

/**
 * @actions/core writes workflow commands (::debug::, ::warning::, ...) directly
 * to stdout. They are only meaningful to the Actions runner and, when the test
 * suite runs inside a workflow, they turn expected test output into job
 * annotations. Drop them while testing.
 */

const workflowCommand = /^::[\w-]+( [^:]*)?::/;

const originalWrite = process.stdout.write.bind(process.stdout);

process.stdout.write = function (chunk: any, ...args: any[]): boolean {
  if (typeof chunk === "string" && workflowCommand.test(chunk)) {
    const callback = args[args.length - 1];
    if (typeof callback === "function") callback();
    return true;
  }
  return originalWrite(chunk, ...args);
} as typeof process.stdout.write;

export {};
