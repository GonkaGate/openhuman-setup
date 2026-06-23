import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  credentialOutcome,
  inspectGonkaGateCredential,
  inspectOpenHumanSession,
} from "../dist/openhuman/credentials.js";
import { redactSecrets } from "../dist/util/redact.js";

const tempRoot = await mkdtemp(join(tmpdir(), "openhuman-setup-creds-"));

try {
  const userDir = join(tempRoot, "users", "u-1");
  await mkdir(userDir, { recursive: true });
  const configPath = join(userDir, "config.toml");
  await writeFile(configPath, "");
  await writeFile(
    join(userDir, "auth-profiles.json"),
    JSON.stringify({
      active_profiles: {
        "app-session": "app-session:default",
        "provider:gonkagate": "provider:gonkagate:default",
      },
      profiles: {
        "app-session:default": {
          profile_name: "default",
          provider: "app-session",
        },
        "provider:gonkagate:default": {
          profile_name: "default",
          provider: "provider:gonkagate",
        },
      },
      schema_version: 1,
      updated_at: "2026-06-21T00:00:00Z",
    }),
  );

  const credential = await inspectGonkaGateCredential(configPath);
  assert.equal(credential.status, "present");
  assert.equal(credentialOutcome(credential).status, "already_present");

  const session = await inspectOpenHumanSession(configPath);
  assert.equal(session.status, "present");

  const missingConfig = join(tempRoot, "missing", "config.toml");
  const missing = await inspectGonkaGateCredential(missingConfig);
  assert.equal(missing.status, "missing");
  const manual = credentialOutcome(missing);
  assert.equal(manual.status, "manual_required");
  assert.match(manual.nextAction, /Settings -> AI/);

  assert.equal(
    redactSecrets("bad gp-test-secret-123 value"),
    "bad gp-...REDACTED value",
  );
} finally {
  await rm(tempRoot, { force: true, recursive: true });
}
