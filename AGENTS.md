@/Users/daniil/.codex/RTK.md

--- project-doc ---

# AGENTS.md

## What This Repository Is

`openhuman-setup` is the public onboarding repository for configuring OpenHuman
to use GonkaGate as an OpenAI-compatible inference provider.

Intended public flow:

```bash
npx @gonkagate/openhuman-setup
```

Current honest state:

- this repository contains a TypeScript CLI that writes OpenHuman's native
  GonkaGate custom-provider config shape
- the CLI fetches `GET https://api.gonkagate.com/v1/models` with the user's API
  key and uses that live response as the runtime model source of truth
- the CLI preserves unrelated TOML config, creates one timestamped backup when
  replacing an existing config file, and verifies the written shape
- the CLI accepts secrets only through hidden prompt, `GONKAGATE_API_KEY`, or
  `--api-key-stdin`
- direct `auth-profiles.json` mutation is intentionally not implemented because
  current OpenHuman credential storage depends on runtime keychain/encrypted
  JSON policy; the CLI reports the exact OpenHuman Settings -> AI manual step

If implementation status, package name, config locations, routing behavior, or
security flow changes, update this file immediately.

## Fixed Product Invariants

- the npm package is `@gonkagate/openhuman-setup`
- the intended public npm entrypoint is `npx @gonkagate/openhuman-setup`
- the stable GonkaGate provider id is `gonkagate`
- the canonical GonkaGate base URL is `https://api.gonkagate.com/v1`
- the current transport target is `/v1/chat/completions`
- the runtime model catalog source is authenticated `/v1/models`
- OpenHuman configuration is TOML-based and must preserve unrelated user config
- `gp-...` secrets must never be printed
- secrets must not be accepted through a plain `--api-key` flag
- safe secret inputs are hidden prompt, `GONKAGATE_API_KEY`, and
  `--api-key-stdin`
- setup success is based on live model-catalog fetch, local config verification,
  and a direct GonkaGate smoke check, with OpenHuman sign-in reported as a
  separate runtime gate

## OpenHuman Integration Notes

OpenHuman already has an OpenAI-compatible provider path, but the setup utility
must write the current native custom-provider shape:

- `cloud_providers` entry with slug `gonkagate`
- workload provider strings such as `gonkagate:<live-model-id>`
- provider credentials under `provider:gonkagate`, profile `default`, entered
  through OpenHuman Settings -> AI unless a future supported OpenHuman RPC/API
  write path is added

The setup utility must still account for OpenHuman's internal tier model names:

- `reasoning-v1`
- `agentic-v1`
- `coding-v1`
- `summarization-v1`
- `fast-v1`

GonkaGate expects concrete model ids. The CLI routes workloads to concrete
GonkaGate model ids returned by `/v1/models` and reports OpenHuman's
active-session gate for custom providers when the user is signed out.

## Change Discipline

When behavior changes:

- update `AGENTS.md`
- update `README.md`
- update relevant files in `docs/`
- update tests under `test/`
- keep the CLI output honest about implemented versus planned behavior

## Validation

Current local validation baseline:

```bash
npm run ci
```
