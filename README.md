# @gonkagate/openhuman-setup

Configure OpenHuman to use GonkaGate as an OpenAI-compatible inference provider
in one `npx` command.

```bash
npx @gonkagate/openhuman-setup
```

![Package](https://img.shields.io/badge/package-%40gonkagate%2Fopenhuman--setup-6E63FF?style=flat-square)
![Node](https://img.shields.io/badge/node-%3E%3D22.14.0-4DA2FF?style=flat-square)
![OpenHuman](https://img.shields.io/badge/OpenHuman-native%20custom%20provider-35D6FF?style=flat-square)
![License](https://img.shields.io/badge/license-Apache--2.0-2A2A2A?style=flat-square)

[![Website](https://img.shields.io/badge/Website-gonkagate.com-111827?style=flat-square)](https://gonkagate.com/en?utm_source=github&utm_medium=referral&utm_campaign=openhuman_setup&utm_content=readme_badge_website)
[![Docs](https://img.shields.io/badge/Docs-API%20Guides-2563EB?style=flat-square)](https://gonkagate.com/en/docs?utm_source=github&utm_medium=referral&utm_campaign=openhuman_setup&utm_content=readme_badge_docs)
[![API%20Key](https://img.shields.io/badge/API%20Key-Dashboard-F97316?style=flat-square)](https://gonkagate.com/en/register?utm_source=github&utm_medium=referral&utm_campaign=openhuman_setup&utm_content=readme_badge_api_key)
[![Telegram](https://img.shields.io/badge/Telegram-%40gonkagate-229ED9?style=flat-square&logo=telegram&logoColor=white)](https://t.me/gonkagate)
[![X](https://img.shields.io/badge/X-%40gonkagate-000000?style=flat-square&logo=x&logoColor=white)](https://x.com/gonkagate)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-GonkaGate-0A66C2?style=flat-square&logo=linkedin&logoColor=white)](https://www.linkedin.com/company/gonkagate)

## Overview

`@gonkagate/openhuman-setup` is the onboarding CLI for OpenHuman users who want
GonkaGate configured as a native OpenAI-compatible custom provider without
hand-editing OpenHuman TOML config.

The CLI writes OpenHuman's native `cloud_providers` shape, routes OpenHuman
agent workloads to curated GonkaGate model IDs, preserves unrelated config,
creates a timestamped backup before replacing an existing config file, and
verifies the written result.

Current OpenHuman credential storage is not a safe standalone JSON write target.
OpenHuman may store provider secrets in the OS keychain or encrypted JSON
depending on runtime policy. This CLI therefore does not mutate
`auth-profiles.json`; it prints the OpenHuman Settings -> AI step for the
GonkaGate key and redacts any `gp-...` value from output.

## Quick Start

```bash
npx @gonkagate/openhuman-setup
```

You need:

- Node.js `>=22.14.0`
- local OpenHuman config on this machine
- a GonkaGate API key from the dashboard
- an active OpenHuman session before custom providers can run inside OpenHuman

## What It Does

- Detects the effective OpenHuman `config.toml`, including
  `OPENHUMAN_WORKSPACE`, active user, legacy active workspace, staging root, and
  pre-login local config.
- Adds one GonkaGate `cloud_providers` entry with slug `gonkagate`.
- Writes workload provider strings for chat, reasoning, agentic, coding, and
  memory/summarization paths.
- Preserves unrelated TOML values and unrelated cloud providers.
- Creates one timestamped backup before replacing an existing config file.
- Verifies the local config shape after writing.
- Runs a direct GonkaGate `/v1/chat/completions` smoke when a key is available.
- Reports OpenHuman sign-in and credential state separately.

## Target OpenHuman Contract

- Package: `@gonkagate/openhuman-setup`
- Provider id: `gonkagate`
- Base URL: `https://api.gonkagate.com/v1`
- Transport: `/v1/chat/completions`
- OpenHuman provider shape: `cloud_providers` entry plus workload provider
  strings
- OpenHuman credential key: `provider:gonkagate`, profile `default`
- Recommended model: `moonshotai/kimi-k2.6`
- Additional validated model: `qwen/qwen3-235b-a22b-instruct-2507-fp8`

## Safe Secret Handling

Allowed secret inputs:

- hidden interactive prompt
- `GONKAGATE_API_KEY`
- `--api-key-stdin`

Not allowed:

- plain `--api-key`
- repository-local secret storage
- shell profile mutation
- direct standalone writes to OpenHuman `auth-profiles.json`

## Non-Interactive Setup

```bash
GONKAGATE_API_KEY=gp-... npx @gonkagate/openhuman-setup --yes
```

Or pass the key through stdin:

```bash
printf '%s' "$GONKAGATE_API_KEY" | npx @gonkagate/openhuman-setup --api-key-stdin --yes --json
```

## Model Overrides

Defaults:

- reasoning, agentic, coding: `gonkagate:moonshotai/kimi-k2.6`
- chat, memory/summarization: `gonkagate:qwen/qwen3-235b-a22b-instruct-2507-fp8`

Use curated model keys only:

```bash
npx @gonkagate/openhuman-setup \
  --reasoning-model kimi-k2.6 \
  --agentic-model kimi-k2.6 \
  --coding-model kimi-k2.6 \
  --summarization-model qwen3-235b-a22b-instruct-2507-fp8
```

## What This Tool Does Not Do

- It does not install OpenHuman.
- It does not write the old `api_url` + `api_key` + `model_routes` setup shape.
- It does not accept arbitrary custom base URLs.
- It does not accept arbitrary raw model IDs.
- It does not print or persist `gp-...` secrets outside approved OpenHuman
  credential handling.
- It does not directly mutate OpenHuman `auth-profiles.json`.

## Release Proof

Automated release proof is `npm run ci` plus a temp-workspace CLI smoke. Before
publishing, also run one real-workspace smoke with an active OpenHuman session
and a real GonkaGate key pasted through OpenHuman Settings -> AI. Current proof
notes live in
[`docs/specs/openhuman-setup-prd/release-proof.md`](docs/specs/openhuman-setup-prd/release-proof.md).

## Local Development

```bash
npm install
npm run ci
```

The CLI can be exercised against a temporary OpenHuman workspace with:

```bash
npm run build
OPENHUMAN_WORKSPACE="$(mktemp -d)" node bin/gonkagate-openhuman.js --json --yes
```

The product requirements for the implementation live in
[`docs/specs/openhuman-setup-prd/spec.md`](docs/specs/openhuman-setup-prd/spec.md).
The current execution plan lives in
[`docs/specs/openhuman-setup-prd/implementation-plan.md`](docs/specs/openhuman-setup-prd/implementation-plan.md).
