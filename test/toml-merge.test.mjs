import assert from "node:assert/strict";
import { parse } from "smol-toml";
import { resolveOpenHumanWorkloadProviders } from "../dist/constants/models.js";
import {
  mergeGonkaGateConfig,
  verifyGonkaGateConfig,
} from "../dist/openhuman/toml.js";

const providers = resolveOpenHumanWorkloadProviders({}, [
  { id: "live/default-model" },
]);

const fresh = mergeGonkaGateConfig("", providers);
const freshConfig = parse(fresh);
assert.equal(freshConfig.cloud_providers.length, 1);
assert.equal(freshConfig.cloud_providers[0].slug, "gonkagate");
assert.equal(
  freshConfig.cloud_providers[0].endpoint,
  "https://api.gonkagate.com/v1",
);
assert.equal(freshConfig.reasoning_provider, "gonkagate:live/default-model");
assert.deepEqual(verifyGonkaGateConfig(fresh, providers), []);

const existing = `
title = "keep"
chat_provider = "openhuman"

[dashboard]
enabled = true

[[cloud_providers]]
slug = "openai"
label = "OpenAI"
endpoint = "https://api.openai.com/v1"
auth_style = "bearer"
`;
const merged = mergeGonkaGateConfig(existing, providers);
const mergedConfig = parse(merged);
assert.equal(mergedConfig.title, "keep");
assert.equal(mergedConfig.dashboard.enabled, true);
assert.equal(mergedConfig.cloud_providers.length, 2);
assert.ok(
  mergedConfig.cloud_providers.some((provider) => provider.slug === "openai"),
);
assert.ok(
  mergedConfig.cloud_providers.some(
    (provider) => provider.slug === "gonkagate",
  ),
);

const replaced = mergeGonkaGateConfig(
  `
[[cloud_providers]]
slug = "gonkagate"
label = "Old"
endpoint = "https://old.example/v1"
auth_style = "bearer"

[[cloud_providers]]
slug = "gonkagate"
label = "Duplicate"
endpoint = "https://dup.example/v1"
auth_style = "bearer"
`,
  providers,
);
const replacedConfig = parse(replaced);
assert.equal(
  replacedConfig.cloud_providers.filter(
    (provider) => provider.slug === "gonkagate",
  ).length,
  1,
);
assert.equal(
  replacedConfig.cloud_providers[0].endpoint,
  "https://api.gonkagate.com/v1",
);
assert.equal(mergeGonkaGateConfig(replaced, providers), replaced);
