# OpenHuman Setup Release Proof

Date: 2026-06-21

## Automated Proof

- `npm run ci` passes.
- Temp-workspace CLI smoke writes OpenHuman native GonkaGate config with a
  mocked authenticated `/v1/models` response:
  `OPENHUMAN_WORKSPACE=/tmp/openhuman-setup-smoke-codex GONKAGATE_API_KEY=gp-... node bin/gonkagate-openhuman.js --json --yes`.
- The smoke-written config contains one `cloud_providers` entry with slug
  `gonkagate` and workload provider strings for chat, reasoning, agentic,
  coding, and memory.

## Manual Live Proof

Not completed in this environment.

Current blocker:

- A live `GONKAGATE_API_KEY` is not set.
- OpenHuman discovery resolves to pre-login config:
  `/Users/daniil/.openhuman/users/local/config.toml`.
- OpenHuman session inspection reports `missing`.
- GonkaGate credential inspection reports `missing`.

Before publishing, run one real-workspace smoke with an active OpenHuman session
and a real GonkaGate key entered through OpenHuman Settings -> AI.

## Checkpoint Log

- T0 Baseline: `npm run ci` passes; upstream OpenHuman HEAD matched
  `35b7073d6a3afe48ecd2a780fad3b147b35530fc` during implementation.
- T1 Config Discovery: fixture tests cover `OPENHUMAN_WORKSPACE`,
  `OPENHUMAN_APP_ENV=staging`, `active_user.toml`, `active_workspace.toml`, and
  pre-login `users/local/config.toml`.
- T2 Pure TOML Merge: fixture tests cover fresh config, unrelated provider
  preservation, GonkaGate replacement, and idempotency.
- T3 Model Selection: tests cover live `/v1/models` parsing, first-live-model
  defaults, global `--model`, per-workload overrides, and live-id rejection.
- T4 Secret Intake And Redaction: tests cover `GONKAGATE_API_KEY`,
  `--api-key-stdin`, plain `--api-key` rejection, and `gp-...` redaction.
- T5 Credential Storage: current safe outcome is no direct `auth-profiles.json`
  write; output reports the OpenHuman Settings -> AI step for
  `provider:gonkagate` / `default`.
- T6 Atomic Writes And Backups: filesystem test proves timestamped backup and
  atomic replacement.
- T7 Verification: tests cover local config verification, direct GonkaGate smoke
  status, credential status, and OpenHuman session status.
- T8 User Output: CLI tests cover JSON status output and secret redaction.
- T9 Docs And Release Readiness: docs are updated; automated proof passes;
  temp-workspace smoke passes; real-workspace live smoke remains blocked by
  missing local session and key.
