import assert from "node:assert/strict";
import {
  parseGonkaGateModels,
  resolveOpenHumanWorkloadProviders,
} from "../dist/constants/models.js";
import { parseCliArgs } from "../dist/cli/parse.js";

const liveModels = parseGonkaGateModels({
  data: [
    { id: "live/default-model", name: "Default Model" },
    { id: "live/default-model", name: "Duplicate ignored" },
    { id: "live/extra-model", name: "Extra Model" },
  ],
});

assert.deepEqual(liveModels, [
  { id: "live/default-model", name: "Default Model" },
  { id: "live/extra-model", name: "Extra Model" },
]);

const defaults = resolveOpenHumanWorkloadProviders({}, liveModels);
assert.equal(
  defaults.find((provider) => provider.workload === "reasoning").providerString,
  "gonkagate:live/default-model",
);

const global = resolveOpenHumanWorkloadProviders(
  {
    globalModelKey: "live/extra-model",
  },
  liveModels,
);
assert.ok(global.every((provider) => provider.model === "live/extra-model"));

const override = resolveOpenHumanWorkloadProviders(
  {
    codingModelKey: "live/extra-model",
  },
  liveModels,
);
assert.equal(
  override.find((provider) => provider.workload === "coding").providerString,
  "gonkagate:live/extra-model",
);
assert.equal(
  override.find((provider) => provider.workload === "reasoning").providerString,
  "gonkagate:live/default-model",
);

assert.throws(
  () =>
    resolveOpenHumanWorkloadProviders(
      { globalModelKey: "missing/model" },
      liveModels,
    ),
  /Valid choices: live\/default-model, live\/extra-model/,
);

assert.equal(
  parseCliArgs(["node", "cmd", "--model", "unknown/live-model"]).modelKey,
  "unknown/live-model",
);

assert.throws(
  () => parseCliArgs(["node", "cmd", "--api-key=gp-secret-123"]),
  (error) =>
    error instanceof Error &&
    /GONKAGATE_API_KEY/.test(error.message) &&
    !/gp-secret-123/.test(error.message),
);
