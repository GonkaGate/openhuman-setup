import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { parse } from "smol-toml";
import { executeCli } from "../dist/cli/execute.js";
import { parseCliArgs } from "../dist/cli/parse.js";

const execFileAsync = promisify(execFile);

const tempRoot = await mkdtemp(join(tmpdir(), "openhuman-setup-cli-"));

try {
  const workspace = join(tempRoot, "env-root");
  const mockFetchPath = join(tempRoot, "mock-fetch.mjs");
  await writeFile(
    mockFetchPath,
    `
globalThis.fetch = async (url, init) => {
  const href = String(url);
  if (init?.headers?.Authorization !== "Bearer gp-test-key") {
    return new Response("bad auth", { status: 401 });
  }
  if (href === "https://api.gonkagate.com/v1/models") {
    return Response.json({ data: [{ id: "live/default-model", name: "Default" }, { id: "live/extra-model" }] });
  }
  if (href === "https://api.gonkagate.com/v1/chat/completions") {
    return Response.json({ ok: true });
  }
  return new Response("not found", { status: 404 });
};
`,
  );
  const { stdout } = await execFileAsync(
    process.execPath,
    ["bin/gonkagate-openhuman.js", "--json", "--yes"],
    {
      env: {
        ...process.env,
        GONKAGATE_API_KEY: "gp-test-key",
        NODE_OPTIONS: `--import=${pathToFileURL(mockFetchPath).href}`,
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
  assert.equal(result.verification.gonkaGateSmoke.status, "passed");

  const config = parse(await readFile(join(workspace, "config.toml"), "utf8"));
  assert.equal(config.api_url, undefined);
  assert.equal(config.cloud_providers.length, 1);
  assert.equal(config.cloud_providers[0].slug, "gonkagate");
  assert.equal(config.chat_provider, "gonkagate:live/default-model");

  const overrideWorkspace = join(tempRoot, "override-workspace");
  const overrideOptions = parseCliArgs([
    "node",
    "gonkagate-openhuman",
    "--json",
    "--yes",
    "--api-key-stdin",
    "--model",
    "live/extra-model",
  ]);
  const overrideResult = await executeCli(overrideOptions, {
    env: { OPENHUMAN_WORKSPACE: overrideWorkspace },
    fetch: liveFetch,
    readStdin: async () => "gp-test-key\n",
  });
  assert.equal(overrideResult.ok, true);
  const overrideConfig = parse(
    await readFile(join(overrideWorkspace, "config.toml"), "utf8"),
  );
  assert.equal(overrideConfig.chat_provider, "gonkagate:live/extra-model");
  assert.equal(overrideConfig.reasoning_provider, "gonkagate:live/extra-model");

  const interactiveWorkspace = join(tempRoot, "interactive-workspace");
  const interactiveResult = await executeCli(
    parseCliArgs(["node", "gonkagate-openhuman"]),
    {
      env: {
        GONKAGATE_API_KEY: "gp-test-key",
        OPENHUMAN_WORKSPACE: interactiveWorkspace,
      },
      fetch: liveFetch,
      isInteractive: true,
      promptModel: async (models) => models[1].id,
    },
  );
  assert.equal(interactiveResult.ok, true);
  const interactiveConfig = parse(
    await readFile(join(interactiveWorkspace, "config.toml"), "utf8"),
  );
  assert.equal(interactiveConfig.chat_provider, "gonkagate:live/extra-model");

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
    fetch: async (url) =>
      String(url) === "https://api.gonkagate.com/v1/models"
        ? Response.json({ data: [{ id: "live/redaction-model" }] })
        : new Response("upstream rejected gp-test-secret-123", {
            status: 401,
          }),
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

async function liveFetch(url, init) {
  assert.equal(init?.headers?.Authorization, "Bearer gp-test-key");
  const href = String(url);
  if (href === "https://api.gonkagate.com/v1/models") {
    return Response.json({
      data: [
        { id: "live/default-model", name: "Default" },
        { id: "live/extra-model", name: "Extra" },
      ],
    });
  }
  if (href === "https://api.gonkagate.com/v1/chat/completions") {
    return Response.json({ ok: true });
  }
  return new Response("not found", { status: 404 });
}
