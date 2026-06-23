import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const readme = await readFile("README.md", "utf8");
const security = await readFile("docs/security.md", "utf8");
const prd = await readFile("docs/specs/openhuman-setup-prd/spec.md", "utf8");
const releaseProof = await readFile(
  "docs/specs/openhuman-setup-prd/release-proof.md",
  "utf8",
);
const tasks = await readFile("docs/specs/openhuman-setup-prd/tasks.md", "utf8");

assert.match(readme, /@gonkagate\/openhuman-setup/);
assert.match(readme, /https:\/\/api\.gonkagate\.com\/v1/);
assert.match(readme, /moonshotai\/kimi-k2\.6/);
assert.match(readme, /qwen\/qwen3-235b-a22b-instruct-2507-fp8/);
assert.match(security, /GONKAGATE_API_KEY/);
assert.match(security, /--api-key-stdin/);
assert.match(security, /must not accept a plain `--api-key` flag/);

assert.match(readme, /docs\/specs\/openhuman-setup-prd\/spec\.md/);
assert.match(prd, /cloud_providers/);
assert.match(prd, /provider:gonkagate/);
assert.match(prd, /chat_provider/);
for (const tier of [
  "reasoning-v1",
  "agentic-v1",
  "coding-v1",
  "summarization-v1",
]) {
  assert.match(prd, new RegExp(tier));
}
assert.match(prd, /moonshotai\/kimi-k2\.6/);
assert.match(prd, /qwen\/qwen3-235b-a22b-instruct-2507-fp8/);
assert.match(prd, /--reasoning-model <key>/);
assert.match(prd, /--summarization-model <key>/);
assert.match(prd, /Setup success must not mean only "file write completed."/);
assert.match(prd, /credential-store boundary/);
assert.match(releaseProof, /Automated Proof/);
assert.match(releaseProof, /Manual Live Proof/);
assert.match(
  tasks,
  /\/goal Implement docs\/specs\/openhuman-setup-prd\/tasks\.md/,
);
assert.match(tasks, /cloud_providers/);
assert.match(tasks, /provider:gonkagate/);
assert.match(tasks, /npm run ci/);
