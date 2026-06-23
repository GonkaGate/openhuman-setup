# OpenHuman Setup Implementation Plan

Date: 2026-06-21

This plan is optimized for Codex Goal mode: one durable objective, explicit
verification, narrow boundaries, and a concrete task file.

## Goal Contract

Implement `@gonkagate/openhuman-setup` as a real OpenHuman native provider setup
utility.

Done means:

- the CLI can resolve an OpenHuman workspace/config;
- it can merge the GonkaGate `cloud_providers` entry and workload provider
  strings without deleting unrelated TOML;
- it can collect a GonkaGate key only through safe inputs;
- it either stores credentials through OpenHuman's provider credential shape or
  stops before writing secrets and prints the manual Settings step;
- it verifies the resulting shape and direct GonkaGate chat-completions path
  when credentials are available;
- `npm run ci` passes.

## Boundaries

- Use the current native OpenHuman shape: `cloud_providers`, `*_provider`
  workload fields, and `provider:gonkagate` credentials.
- Do not use the legacy `api_url` + `api_key` + `model_routes` path as the v1
  write target.
- Do not add arbitrary base URLs or raw model ids.
- Do not install or patch OpenHuman.
- Do not print, log, or place `gp-...` secrets in argv, output, repository
  files, or backup filenames.

## Work Strategy

Start with pure config logic before touching secrets or live writes. Each slice
must leave one small runnable check behind. Prefer fixture tests over broad
mocking.

Order:

1. Config discovery and pure TOML merge.
2. Safe secret intake and redaction.
3. Credential storage decision/writer.
4. Atomic writes and backups.
5. Verification and user-facing result output.
6. Docs/status update from scaffold to shipped behavior.

## Task File

Use `docs/specs/openhuman-setup-prd/tasks.md` as the execution checklist for a
Codex Goal run. It contains the copy-ready `/goal` prompt, checkpoint list,
verification commands, and blocked stop conditions.
