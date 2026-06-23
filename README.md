# GonkaGate OpenHuman Setup

`openhuman-setup` configures OpenHuman to use GonkaGate as an OpenAI-compatible
provider.

```bash
npx @gonkagate/openhuman-setup
```

Current status: the CLI writes OpenHuman's native `cloud_providers` provider
shape, preserves unrelated TOML config, creates a timestamped backup before
replacing an existing config file, and verifies the written config.

Current OpenHuman credential storage is not a safe standalone JSON write target:
OpenHuman may store secrets in the OS keychain or encrypted JSON depending on
runtime policy. This CLI therefore does not mutate `auth-profiles.json`; it
prints the OpenHuman Settings -> AI step for the GonkaGate key and redacts any
`gp-...` value from output.

## Target Contract

- Package: `@gonkagate/openhuman-setup`
- Provider id: `gonkagate`
- Base URL: `https://api.gonkagate.com/v1`
- Transport: `/v1/chat/completions`
- OpenHuman provider shape: `cloud_providers` entry plus workload provider
  strings
- OpenHuman credential key: `provider:gonkagate`, profile `default`
- Recommended model: `moonshotai/kimi-k2.6`
- Additional validated model: `qwen/qwen3-235b-a22b-instruct-2507-fp8`

## Safe Secret Inputs

- hidden interactive prompt
- `GONKAGATE_API_KEY`
- `--api-key-stdin`

The utility must not accept a plain `--api-key` flag and must never print the
`gp-...` key.

## Development

```bash
npm install
npm run ci
```

The CLI can be exercised against a temporary OpenHuman workspace with:

```bash
npm run build
OPENHUMAN_WORKSPACE="$(mktemp -d)" node bin/gonkagate-openhuman.js --json --yes
```

## Implementation Notes

Current OpenHuman builds expose a native custom-provider shape:
`cloud_providers` entries plus workload provider strings like
`gonkagate:moonshotai/kimi-k2.6`. The implementation should write that shape,
not the older `api_url` + `api_key` + `model_routes` direct-inference path.

Provider keys belong in OpenHuman's provider credential namespace
(`provider:gonkagate`, profile `default`). Because direct standalone writes
cannot safely reproduce OpenHuman's keychain/encrypted-JSON policy, the current
CLI reports the manual Settings -> AI key step instead of persisting secrets.
OpenHuman still requires an active app session before custom providers can run,
so setup verification reports that gate separately from GonkaGate key validity.

## Release Proof

Automated release proof is `npm run ci` plus a temp-workspace CLI smoke. Before
publishing, also run one real-workspace smoke with an active OpenHuman session
and a real GonkaGate key pasted through OpenHuman Settings -> AI. Current proof
notes live in
[`docs/specs/openhuman-setup-prd/release-proof.md`](docs/specs/openhuman-setup-prd/release-proof.md).

The product requirements for the implementation live in
[`docs/specs/openhuman-setup-prd/spec.md`](docs/specs/openhuman-setup-prd/spec.md).
The current execution plan lives in
[`docs/specs/openhuman-setup-prd/implementation-plan.md`](docs/specs/openhuman-setup-prd/implementation-plan.md).
