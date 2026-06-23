import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const pkg = JSON.parse(await readFile("package.json", "utf8"));

assert.equal(pkg.name, "@gonkagate/openhuman-setup");
assert.equal(pkg.type, "module");
assert.equal(pkg.bin["openhuman-setup"], "bin/gonkagate-openhuman.js");
assert.equal(pkg.bin["gonkagate-openhuman"], "bin/gonkagate-openhuman.js");
assert.match(pkg.description, /OpenHuman/);
assert.ok(pkg.files.includes("dist"));
assert.ok(pkg.scripts.ci.includes("typecheck"));
assert.ok(pkg.dependencies.commander);
assert.ok(pkg.dependencies["smol-toml"]);
