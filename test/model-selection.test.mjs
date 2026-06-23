import assert from "node:assert/strict";
import { resolveOpenHumanWorkloadProviders } from "../dist/constants/models.js";
import { parseCliArgs } from "../dist/cli/parse.js";

const defaults = resolveOpenHumanWorkloadProviders();
assert.equal(
  defaults.find((provider) => provider.workload === "reasoning").providerString,
  "gonkagate:moonshotai/kimi-k2.6",
);
assert.equal(
  defaults.find((provider) => provider.workload === "memory").providerString,
  "gonkagate:qwen/qwen3-235b-a22b-instruct-2507-fp8",
);

const global = resolveOpenHumanWorkloadProviders({
  globalModelKey: "qwen3-235b-a22b-instruct-2507-fp8",
});
assert.ok(
  global.every(
    (provider) => provider.model === "qwen/qwen3-235b-a22b-instruct-2507-fp8",
  ),
);

const override = resolveOpenHumanWorkloadProviders({
  codingModelKey: "qwen3-235b-a22b-instruct-2507-fp8",
});
assert.equal(
  override.find((provider) => provider.workload === "coding").providerString,
  "gonkagate:qwen/qwen3-235b-a22b-instruct-2507-fp8",
);
assert.equal(
  override.find((provider) => provider.workload === "reasoning").providerString,
  "gonkagate:moonshotai/kimi-k2.6",
);

assert.throws(
  () => resolveOpenHumanWorkloadProviders({ globalModelKey: "raw/model" }),
  /Valid choices: .*kimi-k2\.6/,
);

assert.throws(
  () => parseCliArgs(["node", "cmd", "--api-key=gp-secret-123"]),
  (error) =>
    error instanceof Error &&
    /GONKAGATE_API_KEY/.test(error.message) &&
    !/gp-secret-123/.test(error.message),
);
