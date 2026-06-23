import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

async function collectTests(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const tests = [];

  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      tests.push(...(await collectTests(path)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".test.mjs")) {
      tests.push(path);
    }
  }

  return tests.sort();
}

const tests = await collectTests("test");

if (tests.length === 0) {
  throw new Error("No tests found.");
}

for (const testPath of tests) {
  await import(pathToFileURL(testPath).href);
}

console.log(`ok - ${tests.length} test files`);
