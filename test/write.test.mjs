import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeConfigAtomically } from "../dist/openhuman/write.js";

const tempRoot = await mkdtemp(join(tmpdir(), "openhuman-setup-write-"));

try {
  const configPath = join(tempRoot, "config.toml");
  const original = 'title = "keep"\n';
  await writeFile(configPath, original, { mode: 0o600 });

  const result = await writeConfigAtomically(
    configPath,
    'title = "new"\n',
    new Date("2026-06-21T12:00:00.000Z"),
  );

  assert.equal(result.configPath, configPath);
  assert.match(
    result.backupPath,
    /config\.toml\.gonkagate-2026-06-21T12-00-00-000Z\.bak$/,
  );
  assert.equal(await readFile(result.backupPath, "utf8"), original);
  assert.equal(await readFile(configPath, "utf8"), 'title = "new"\n');
} finally {
  await rm(tempRoot, { force: true, recursive: true });
}
