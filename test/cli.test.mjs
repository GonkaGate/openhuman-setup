import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { parse } from "smol-toml";
import { executeCli } from "../dist/cli/execute.js";
import { parseCliArgs } from "../dist/cli/parse.js";

const execFileAsync = promisify(execFile);

const tempRoot = await mkdtemp(join(tmpdir(), "openhuman-setup-cli-"));

try {
  const workspace = join(tempRoot, "env-root");
  const { stdout } = await execFileAsync(
    process.execPath,
    ["bin/gonkagate-openhuman.js", "--json", "--yes"],
    {
      env: {
        ...process.env,
        GONKAGATE_API_KEY: "",
        OPENHUMAN_WORKSPACE: workspace,
      },
    },
  );

  const result = JSON.parse(stdout);
  assert.equal(result.ok, true);
  assert.equal(result.status, "action_required");
  assert.equal(result.plan.packageName, "@gonkagate/openhuman-setup");
  assert.equal(result.plan.target.baseUrl, "https://api.gonkagate.com/v1");
  assert.equal(result.plan.openhuman.cloudProvider.slug, "gonkagate");
  assert.equal(result.plan.openhuman.cloudProvider.authStyle, "bearer");
  assert.equal(
    result.plan.openhuman.credential.providerKey,
    "provider:gonkagate",
  );
  assert.equal(result.config.backupPath, null);
  assert.equal(result.credentials.written, false);
  assert.equal(result.credentials.status, "manual_required");
  assert.equal(result.verification.localConfig.status, "passed");
  assert.equal(result.verification.gonkaGateSmoke.status, "skipped");

  const config = parse(await readFile(join(workspace, "config.toml"), "utf8"));
  assert.equal(config.api_url, undefined);
  assert.equal(config.cloud_providers.length, 1);
  assert.equal(config.cloud_providers[0].slug, "gonkagate");
  assert.equal(
    config.chat_provider,
    "gonkagate:qwen/qwen3-235b-a22b-instruct-2507-fp8",
  );

  const secretWorkspace = join(tempRoot, "secret-workspace");
  const options = parseCliArgs([
    "node",
    "gonkagate-openhuman",
    "--json",
    "--yes",
    "--api-key-stdin",
  ]);
  const secretResult = await executeCli(options, {
    env: { OPENHUMAN_WORKSPACE: secretWorkspace },
    fetch: async () =>
      new Response("upstream rejected gp-test-secret-123", { status: 401 }),
    readStdin: async () => "gp-test-secret-123\n",
  });
  const rendered = JSON.stringify(secretResult);
  assert.equal(secretResult.ok, false);
  assert.equal(secretResult.verification.gonkaGateSmoke.status, "failed");
  assert.doesNotMatch(rendered, /gp-test-secret-123/);
  assert.match(rendered, /gp-\.\.\.REDACTED/);
} finally {
  await rm(tempRoot, { force: true, recursive: true });
}
