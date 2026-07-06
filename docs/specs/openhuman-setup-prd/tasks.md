# OpenHuman Setup Tasks

Date: 2026-06-21

## Codex Goal Prompt

```text
/goal Implement docs/specs/openhuman-setup-prd/tasks.md through the release-readiness checkpoint. Done means the CLI writes the current OpenHuman native GonkaGate provider shape, preserves unrelated config, handles secrets only through approved paths, verifies the result, and `npm run ci` passes. Work in checkpoints, keep diffs narrow, update docs when behavior changes, and stop with evidence if the OpenHuman credential-store format cannot be safely written.
```

## Source Contract

Read these before implementation:

- `AGENTS.md`
- `README.md`
- `docs/specs/openhuman-setup-prd/spec.md`
- `docs/specs/openhuman-setup-prd/fact-check.md`
- `docs/security.md`

## Boundaries

- Use `cloud_providers` plus workload provider strings.
- Use slug `gonkagate`.
- Use endpoint `https://api.gonkagate.com/v1`.
- Use auth style `bearer`.
- Use credential provider key `provider:gonkagate`, profile `default`, when
  credential writing is proven safe.
- Do not use `api_url = "https://api.gonkagate.com/v1"` as the v1 write path.
- Do not use `model_routes` as the primary routing mechanism.
- Do not accept `--api-key`.
- Do not print or persist `gp-...` outside the approved OpenHuman credential
  path.

## Checkpoints

### T0 Baseline

- [ ] Run `npm run ci`.
- [ ] Confirm existing CLI scaffold output matches `cloudProvider`,
      `credential`, and `workloadProviders`.
- [ ] Reconfirm the OpenHuman source contract if the upstream commit in
      `fact-check.md` is stale.

Proof: `npm run ci` passes, or blockers are recorded before implementation.

### T1 Config Discovery

- [ ] Implement OpenHuman config discovery: `OPENHUMAN_WORKSPACE`, app env root,
      active user, legacy active workspace, pre-login local config.
- [ ] Return a structured result that includes every attempted path.
- [ ] Add fixture tests for each discovery branch.

Proof: focused tests cover every configured discovery branch.

### T2 Pure TOML Merge

- [ ] Parse existing TOML with `smol-toml`.
- [ ] Upsert exactly one `cloud_providers` entry for `gonkagate`.
- [ ] Set workload provider fields: `chat_provider`, `reasoning_provider`,
      `agentic_provider`, `coding_provider`, `memory_provider`.
- [ ] Preserve unrelated provider entries and unrelated TOML values.
- [ ] Make reruns idempotent.

Proof: fixture tests for fresh config, existing unrelated providers, existing
GonkaGate provider replacement, and rerun idempotency.

### T3 Model Selection

- [ ] Keep model choices limited to authenticated `/v1/models`.
- [ ] Keep `--model` as a global live-model shortcut for the current scaffold
      contract.
- [ ] Implement explicit flags: `--reasoning-model`, `--agentic-model`,
      `--coding-model`, `--summarization-model`.
- [ ] Reject unknown model ids with valid live choices.

Proof: tests cover live catalog parsing, default model selection, per-workload
overrides, and invalid model rejection.

### T4 Secret Intake And Redaction

- [ ] Implement hidden prompt for interactive use.
- [ ] Implement `GONKAGATE_API_KEY`.
- [ ] Implement `--api-key-stdin`.
- [ ] Keep rejecting plain `--api-key`.
- [ ] Redact `gp-...` in errors, JSON, and normal output.

Proof: tests prove the key does not appear in stdout, stderr, JSON, or thrown
error messages.

### T5 Credential Storage

- [ ] Decide the smallest safe write path for OpenHuman provider credentials.
- [ ] If safe, write `provider:gonkagate` / `default` using OpenHuman's current
      credential-store shape.
- [ ] If not safe, do not write the key; emit the exact OpenHuman Settings step.
- [ ] Keep credential handling separate from config TOML backups.

Proof: tests cover credential-written and manual-key-step outcomes without
leaking key material.

### T6 Atomic Writes And Backups

- [ ] Create one timestamped config backup before replacing config.
- [ ] Do not create secret-bearing backups unless the existing file already
      contained those secrets.
- [ ] Replace config atomically.
- [ ] Report the config path, backup path, and credential outcome.

Proof: filesystem fixture test proves backup, atomic replacement, and no
unrelated config deletion.

### T7 Verification

- [ ] Verify local config shape after write.
- [ ] If a key is available, run direct GonkaGate `/v1/chat/completions` smoke
      with the selected reasoning model.
- [ ] Detect/report OpenHuman app-session presence when possible.
- [ ] Distinguish these states: config written, credential written, GonkaGate
      smoke passed, OpenHuman sign-in still required.

Proof: tests cover local verification states; live smoke is documented as a
release proof when a real key/session is available.

### T8 User Output

- [ ] Human output is concise and never prints the key.
- [ ] JSON output includes machine-readable status for config, credentials,
      smoke check, and OpenHuman session gate.
- [ ] Errors name the failed layer and the next action.

Proof: CLI tests cover normal text output and `--json`.

### T9 Docs And Release Readiness

- [ ] Update `README.md`, `AGENTS.md`, `docs/how-it-works.md`, and
      `docs/security.md` from scaffold status to shipped behavior.
- [ ] Keep `docs/specs/openhuman-setup-prd/spec.md` accurate if behavior
      changes.
- [ ] Run `npm run ci`.
- [ ] Run one temp-workspace CLI smoke.
- [ ] Run one real-workspace smoke with active OpenHuman session and a GonkaGate
      key before publishing.

Proof: `npm run ci` passes and release proof notes separate automated proof from
manual live proof.

## Blocked Stop Conditions

Stop and report evidence instead of guessing if:

- current OpenHuman no longer uses the documented `cloud_providers` shape;
- credential-store writes cannot be proven safe;
- `smol-toml` cannot preserve the required semantics;
- GonkaGate rejects the selected live model during authenticated smoke;
- OpenHuman app-session detection cannot be made reliable enough to report.

## Progress Log Format

After each checkpoint, record:

- checkpoint id;
- files changed;
- command proof;
- remaining risk;
- next checkpoint.
