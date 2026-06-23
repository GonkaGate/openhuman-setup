# OpenHuman Setup PRD

## Status

Implemented for the standalone config-mutating CLI. This PRD defines the first
real product contract for the setup utility and records the remaining
credential-store boundary.

Fact-check update, 2026-06-21: source review against `tinyhumansai/openhuman`
commit `35b7073d6a3afe48ecd2a780fad3b147b35530fc` found that the previous
release blockers have moved out of the critical path. OpenHuman now separates
hosted backend URL handling from custom inference endpoint handling, exposes a
native `cloud_providers` provider list, routes workloads through provider
strings such as `<slug>:<model>`, and stores provider API keys through
`auth-profiles.json`.

v1 can be implemented as an OpenHuman native provider setup utility. It must not
use the older `api_url` + `api_key` + `model_routes` shape as the primary write
path. Current implementation writes config and reports a manual credential step
because direct `auth-profiles.json` mutation cannot safely reproduce OpenHuman's
keychain/encrypted-JSON policy.

See `docs/specs/openhuman-setup-prd/fact-check.md` for the updated evidence log
and `docs/specs/openhuman-setup-prd/implementation-plan.md` for the working
plan.

## Product Summary

`@gonkagate/openhuman-setup` is a public CLI that configures a local OpenHuman
installation to use GonkaGate as its OpenAI-compatible inference backend.

The utility must keep the happy path simple:

```bash
npx @gonkagate/openhuman-setup
```

It should also expose one important advanced capability: users can choose which
validated GonkaGate model powers each OpenHuman agent workload:

- `reasoning-v1`
- `agentic-v1`
- `coding-v1`
- `summarization-v1`

Recommended defaults are provided, but the user can override each workload
during interactive setup or through safe non-interactive flags.

## Problem

OpenHuman can point workloads at custom OpenAI-compatible providers, but
GonkaGate setup is still manual. Users must know where OpenHuman stores config,
how `cloud_providers` entries are shaped, which provider string to write for
each workload, where provider credentials live, which GonkaGate model ids are
valid, and how to avoid breaking unrelated OpenHuman config.

This is fragile for normal users and unnecessarily limiting for advanced agent
users. Different people may want different model trade-offs for planning,
tool-heavy work, coding, and summarization.

## Goals

- Configure OpenHuman to use GonkaGate without hand-editing OpenHuman config.
- Preserve unrelated OpenHuman configuration.
- Collect the GonkaGate API key through safe inputs only.
- Let users select a GonkaGate model for each OpenHuman workload covered by v1.
- Provide recommended defaults that make `--yes` and non-interactive setup
  practical.
- Verify that the resulting setup is effective before reporting success.
- Keep future model catalog changes centralized in the setup utility.

## Non-Goals

- Do not implement arbitrary custom base URLs in v1.
- Do not expose arbitrary non-curated model ids in v1.
- Do not mutate shell profiles or generate `.env` files.
- Do not install or upgrade OpenHuman itself in v1.
- Do not patch the OpenHuman binary at runtime.
- Do not claim `/v1/responses` support; GonkaGate setup targets
  `/v1/chat/completions`.

## Users

### First-Time OpenHuman User

Wants OpenHuman to work with GonkaGate quickly and safely. They should be able
to accept recommended defaults and return to OpenHuman.

### Agent Power User

Wants to tune the agent stack. They may choose a stronger model for reasoning
and coding, and a cheaper/faster model for summarization.

### Automation User

Wants repeatable setup in scripts or CI-like local bootstrap flows without
exposing secrets in command arguments.

## User Stories

- As a user, I can run `npx @gonkagate/openhuman-setup` and configure OpenHuman
  without editing TOML manually.
- As a user, I can accept recommended model mappings for all OpenHuman tiers.
- As a user, I can pick a different validated GonkaGate model for
  `reasoning-v1`, `agentic-v1`, `coding-v1`, and `summarization-v1`.
- As a user, I can run non-interactively with safe defaults.
- As a user, I can provide the API key through `GONKAGATE_API_KEY` or
  `--api-key-stdin`.
- As a user, I can rerun setup without losing unrelated OpenHuman config.
- As a user, I get clear verification output when OpenHuman config is blocked,
  stale, or incompatible.

## Product Flow

1. Start CLI.
2. Detect OpenHuman installation/config context.
3. Resolve target OpenHuman `config.toml`.
4. Present or infer the role-model mapping.
5. Collect GonkaGate API key safely.
6. Create backups for managed config rewrites.
7. Merge GonkaGate settings into OpenHuman config.
8. Verify local config shape.
9. Store or verify GonkaGate credentials through OpenHuman's provider credential
   shape.
10. Verify effective GonkaGate/OpenHuman inference path where possible.
11. Print next step: return to OpenHuman.

## OpenHuman Config Discovery

The utility must follow OpenHuman's current config-resolution behavior:

- `OPENHUMAN_WORKSPACE` when explicitly set.
- Root directory `~/.openhuman`, or `~/.openhuman-staging` when
  `OPENHUMAN_APP_ENV=staging`.
- `active_user.toml` under the root, resolving to
  `<root>/users/<user-id>/config.toml`.
- Legacy `active_workspace.toml` under the root.
- Default pre-login config under `<root>/users/local/config.toml`, not directly
  under `<root>/config.toml`.

The implementation must not assume that `~/.openhuman/config.toml` is always the
effective config.

## GonkaGate Provider Contract

- Provider id: `gonkagate`
- Provider display name: `GonkaGate`
- Base URL: `https://api.gonkagate.com/v1`
- Transport endpoint: `/v1/chat/completions`
- Auth style: `Authorization: Bearer <gp-key>`

Compatibility gate: OpenHuman currently switches to a custom OpenAI-compatible
LLM provider through slug-keyed `cloud_providers` entries and workload provider
strings. v1 must write GonkaGate as a `cloud_providers` entry with slug
`gonkagate` and must route selected workloads with provider strings such as
`gonkagate:moonshotai/kimi-k2.6`.

The previous `api_url` + `api_key` direct-inference path is legacy fallback only
and is out of scope for the primary v1 implementation.

## Curated Model Catalog

The v1 curated model catalog includes:

| Key                                 | Model id                                 | Default use                            |
| ----------------------------------- | ---------------------------------------- | -------------------------------------- |
| `kimi-k2.6`                         | `moonshotai/kimi-k2.6`                   | Recommended general default            |
| `qwen3-235b-a22b-instruct-2507-fp8` | `qwen/qwen3-235b-a22b-instruct-2507-fp8` | Recommended fast/summarization default |

The catalog must stay centralized in code and covered by tests/docs. Future
models can be added when validated against OpenHuman's expected request shape.
Authenticated live catalog validation is required before release;
unauthenticated `GET /v1/models` currently returns `401`.

## Role Model Selection

OpenHuman tier ids are product-level concepts. GonkaGate model ids are provider
model ids. Current OpenHuman builds bridge this through workload provider
strings instead of the old `model_routes`-only path.

### Role Defaults

| OpenHuman concept  | Config field         | Recommended GonkaGate model              |
| ------------------ | -------------------- | ---------------------------------------- |
| `reasoning-v1`     | `reasoning_provider` | `moonshotai/kimi-k2.6`                   |
| `agentic-v1`       | `agentic_provider`   | `moonshotai/kimi-k2.6`                   |
| `coding-v1`        | `coding_provider`    | `moonshotai/kimi-k2.6`                   |
| `summarization-v1` | `memory_provider`    | `qwen/qwen3-235b-a22b-instruct-2507-fp8` |
| fast/chat path     | `chat_provider`      | `qwen/qwen3-235b-a22b-instruct-2507-fp8` |

Current OpenHuman source behavior to account for:

- `cloud_providers` entries are keyed by slug.
- Workloads route through provider strings like `gonkagate:<model-id>`.
- `agentic_provider` does not inherit BYOK routing automatically; v1 must set it
  explicitly if "all agent workloads through GonkaGate" is the selected mode.
- OpenHuman still requires an active app session before custom providers can be
  used at runtime. The setup utility must detect/report this gate.
- `model_routes` is legacy/deprecated for this v1 flow and must not be the main
  setup mechanism.

### Interactive Behavior

Interactive setup should show a model selection step for each covered workload.
The default highlighted option is the recommended model for that workload.

The UI copy should explain the role briefly:

- reasoning: planning, deep thinking, multi-step decisions.
- agentic: tool use, delegation, task execution.
- coding: code generation, review, refactoring.
- summarization: compression, titles, memory summaries, short synthesis.
- chat/fast: short conversational turns and low-latency responses.

The user can accept all defaults quickly or customize individual tiers.

### Non-Interactive Behavior

`--yes` uses all recommended defaults.

Future non-interactive flags should allow explicit tier overrides:

```bash
npx @gonkagate/openhuman-setup \
  --reasoning-model kimi-k2.6 \
  --agentic-model kimi-k2.6 \
  --coding-model kimi-k2.6 \
  --summarization-model qwen3-235b-a22b-instruct-2507-fp8
```

All model override values must resolve to curated validated model keys. Raw
provider model ids are out of scope for v1.

## Config Write Contract

The utility writes the minimum OpenHuman config needed for GonkaGate:

- a `cloud_providers` entry:
  - `slug = "gonkagate"`
  - `label = "GonkaGate"`
  - `endpoint = "https://api.gonkagate.com/v1"`
  - `auth_style = "bearer"`
- workload provider strings such as:
  - `chat_provider = "gonkagate:qwen/qwen3-235b-a22b-instruct-2507-fp8"`
  - `reasoning_provider = "gonkagate:moonshotai/kimi-k2.6"`
  - `agentic_provider = "gonkagate:moonshotai/kimi-k2.6"`
  - `coding_provider = "gonkagate:moonshotai/kimi-k2.6"`
  - `memory_provider = "gonkagate:qwen/qwen3-235b-a22b-instruct-2507-fp8"`
- GonkaGate credentials in OpenHuman's provider credential namespace:
  - provider key `provider:gonkagate`
  - profile `default`

The implementation must preserve existing unrelated `cloud_providers`, workload
routes, model registry entries, and all unrelated TOML fields.

The implementation must preserve unrelated TOML fields and formatting as much as
practical. If exact formatting preservation is not possible, semantic
preservation is required and a backup must be created first.

## Security Requirements

- Never print the `gp-...` key.
- Never accept the key through a plain `--api-key` flag.
- Safe key inputs:
  - hidden interactive prompt
  - `GONKAGATE_API_KEY`
  - `--api-key-stdin`
- Redact secret-bearing diagnostics.
- Do not store secrets in repository-local files.
- Create backups before replacing OpenHuman config.

OpenHuman's current native AI settings path stores provider API keys in
`auth-profiles.json`, using keychain or encrypted-at-rest storage depending on
runtime policy. v1 should use that native provider credential shape only through
a safe OpenHuman-supported write path. Until that exists for this standalone
CLI, it stops before writing secrets and prints the manual OpenHuman Settings
step instead.

## Verification Requirements

Setup success must not mean only "file write completed."

Verification should include:

- OpenHuman config path was resolved.
- GonkaGate base URL is configured.
- GonkaGate `cloud_providers` entry exists exactly once.
- API key is present in provider credentials without printing it.
- Workload routing covers all v1 workloads.
- Selected models are curated validated GonkaGate models.
- A real GonkaGate `/v1/chat/completions` smoke check passes when credentials
  and network allow it.
- OpenHuman has an active app session, or the runtime session requirement is
  explicitly reported as the remaining user action.

If OpenHuman core is running and a stable local RPC path is available, the
utility should additionally verify the effective OpenHuman client config.

## Error UX

Errors must be actionable and non-leaky:

- missing OpenHuman config: explain how config discovery was attempted.
- invalid model key: show valid curated keys.
- unsafe secret flag: tell the user to use hidden prompt, `GONKAGATE_API_KEY`,
  or `--api-key-stdin`.
- failed smoke check: show sanitized status/body and whether config was written.
- blocked effective config: name the inspected layer when possible.

## CLI Surface

Initial public command:

```bash
npx @gonkagate/openhuman-setup
```

Planned flags:

- `--yes`
- `--json`
- `--api-key-stdin`
- `--reasoning-model <key>`
- `--agentic-model <key>`
- `--coding-model <key>`
- `--summarization-model <key>`

Explicitly unsupported:

- `--api-key`
- `--base-url`
- arbitrary raw model ids

## Success Metrics

- A new user can complete setup without editing config files.
- A power user can customize all four tier mappings in one run.
- Reruns are idempotent and preserve unrelated OpenHuman settings.
- CI protects package contract, docs contract, curated model catalog, and role
  defaults.
- Setup output never leaks the GonkaGate API key.

## Open Questions

- Should v1 write `auth-profiles.json` directly, or should it prefer OpenHuman
  local RPC when the app is running and fall back to a manual key step?
- Should `fast-v1` remain a separate CLI flag, or should v1 map it to the
  current OpenHuman `chat_provider` field?
- Should live model catalog validation require an API key, or should the setup
  utility ship only the curated catalog until authenticated verification?
- Should v1 be limited to an OpenHuman version range or commit range until the
  `cloud_providers` and provider credential shape stabilizes further?

## Acceptance Criteria

- `npm run ci` passes.
- PRD exists at `docs/specs/openhuman-setup-prd/spec.md`.
- PRD documents the four required OpenHuman tiers.
- PRD documents user-selectable tier mappings.
- PRD documents recommended defaults for each tier.
- PRD documents safe secret inputs and the ban on `--api-key`.
- PRD documents verification expectations beyond file writes.
