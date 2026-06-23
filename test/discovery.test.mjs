import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { discoverOpenHumanConfig } from "../dist/openhuman/discovery.js";

const tempRoot = await mkdtemp(join(tmpdir(), "openhuman-setup-discovery-"));

try {
  const workspace = join(tempRoot, "env-workspace");
  await mkdir(workspace, { recursive: true });
  await writeFile(join(workspace, "config.toml"), 'title = "env"\n');
  const envWorkspace = await discoverOpenHumanConfig({
    env: { OPENHUMAN_WORKSPACE: workspace },
    homeDir: tempRoot,
  });
  assert.equal(envWorkspace.source, "OPENHUMAN_WORKSPACE");
  assert.equal(envWorkspace.configPath, join(workspace, "config.toml"));
  assert.ok(envWorkspace.attemptedPaths.some((attempt) => attempt.exists));

  const stagingRoot = join(tempRoot, ".openhuman-staging");
  await mkdir(stagingRoot, { recursive: true });
  await writeFile(join(stagingRoot, "active_user.toml"), 'user_id = "u-1"\n');
  const activeUser = await discoverOpenHumanConfig({
    env: { OPENHUMAN_APP_ENV: "staging" },
    homeDir: tempRoot,
  });
  assert.equal(activeUser.source, "active_user.toml");
  assert.equal(activeUser.activeUserId, "u-1");
  assert.equal(
    activeUser.configPath,
    join(stagingRoot, "users", "u-1", "config.toml"),
  );

  const prodRoot = join(tempRoot, ".openhuman");
  await mkdir(prodRoot, { recursive: true });
  await writeFile(
    join(prodRoot, "active_workspace.toml"),
    'config_dir = "legacy-config"\n',
  );
  const activeWorkspace = await discoverOpenHumanConfig({
    env: {},
    homeDir: tempRoot,
  });
  assert.equal(activeWorkspace.source, "active_workspace.toml");
  assert.equal(
    activeWorkspace.configPath,
    join(prodRoot, "legacy-config", "config.toml"),
  );

  await rm(join(prodRoot, "active_workspace.toml"));
  const preLogin = await discoverOpenHumanConfig({
    env: {},
    homeDir: tempRoot,
  });
  assert.equal(preLogin.source, "pre-login");
  assert.equal(
    preLogin.configPath,
    join(prodRoot, "users", "local", "config.toml"),
  );
} finally {
  await rm(tempRoot, { force: true, recursive: true });
}
