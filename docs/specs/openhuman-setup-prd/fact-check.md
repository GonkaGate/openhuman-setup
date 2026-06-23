# OpenHuman Setup Fact Check

Date: 2026-06-21

OpenHuman source checked: `tinyhumansai/openhuman`
`35b7073d6a3afe48ecd2a780fad3b147b35530fc` (`origin/main`, 2026-06-21).

## Verdict

The setup utility is now feasible as an OpenHuman-native custom-provider
installer.

The May blocker is no longer the correct release posture. Current OpenHuman has
the pieces v1 needs:

- `api_url` remains the OpenHuman product backend URL.
- `inference_url` exists as the legacy direct custom inference endpoint.
- the current Settings -> AI path prefers `cloud_providers` plus workload
  provider strings such as `<slug>:<model>`.
- provider API keys are stored through `auth-profiles.json` under
  `provider:<slug>`.
- OpenHuman translates or avoids leaking internal tier names such as
  `reasoning-v1` and `coding-v1` to custom providers on the current routing
  paths reviewed.

The remaining constraints are implementation constraints, not blockers:

- v1 should write the native `cloud_providers`/workload-provider shape, not the
  old `api_url` + `api_key` + `model_routes` shape.
- OpenHuman requires an active app session before custom providers can run.
  Setup must detect/report that gate instead of claiming the app is ready when
  the user is signed out.
- The credential write path needs care. Prefer OpenHuman's provider credential
  format (`provider:gonkagate`, profile `default`) or stop before writing
  secrets and tell the user to paste the key in Settings.

## Current Native Shape

The v1 target config shape is:

```toml
[[cloud_providers]]
slug = "gonkagate"
label = "GonkaGate"
endpoint = "https://api.gonkagate.com/v1"
auth_style = "bearer"

chat_provider = "gonkagate:qwen/qwen3-235b-a22b-instruct-2507-fp8"
reasoning_provider = "gonkagate:moonshotai/kimi-k2.6"
agentic_provider = "gonkagate:moonshotai/kimi-k2.6"
coding_provider = "gonkagate:moonshotai/kimi-k2.6"
memory_provider = "gonkagate:qwen/qwen3-235b-a22b-instruct-2507-fp8"
```

The matching credential key is:

```text
provider:gonkagate / default
```

## Evidence

- Current OpenHuman `Config` has separate `api_url`, `api_key`, and
  `inference_url` fields. `inference_url` is documented as the custom LLM
  inference endpoint, while backend calls continue to use `api_url`:
  <https://github.com/tinyhumansai/openhuman/blob/35b7073d6a3afe48ecd2a780fad3b147b35530fc/src/openhuman/config/schema/types.rs#L82-L90>
- `effective_inference_url` resolves inference separately from
  `effective_backend_api_url`, keeping chat completions separate from hosted
  backend calls:
  <https://github.com/tinyhumansai/openhuman/blob/35b7073d6a3afe48ecd2a780fad3b147b35530fc/src/api/config.rs#L90-L124>
  <https://github.com/tinyhumansai/openhuman/blob/35b7073d6a3afe48ecd2a780fad3b147b35530fc/src/api/config.rs#L139-L186>
- Legacy configs with a full external `/chat/completions` URL are migrated from
  `api_url` into `inference_url`:
  <https://github.com/tinyhumansai/openhuman/blob/35b7073d6a3afe48ecd2a780fad3b147b35530fc/src/openhuman/config/schema/load/migrate.rs#L1-L31>
- `cloud_providers` entries are slug-keyed and are consumed by provider strings
  in the grammar `<slug>:<model>`:
  <https://github.com/tinyhumansai/openhuman/blob/35b7073d6a3afe48ecd2a780fad3b147b35530fc/src/openhuman/config/schema/cloud_providers.rs#L1-L11>
  <https://github.com/tinyhumansai/openhuman/blob/35b7073d6a3afe48ecd2a780fad3b147b35530fc/src/openhuman/inference/provider/factory.rs#L1-L20>
- The current AI settings facade writes cloud providers and per-workload routing
  through `openhuman.inference_update_model_settings`, while API keys go through
  provider credentials:
  <https://github.com/tinyhumansai/openhuman/blob/35b7073d6a3afe48ecd2a780fad3b147b35530fc/app/src/services/api/aiSettingsApi.ts#L1-L14>
- Provider keys are stored as `provider:<slug>` and the UI path uses profile
  `default`:
  <https://github.com/tinyhumansai/openhuman/blob/35b7073d6a3afe48ecd2a780fad3b147b35530fc/app/src/services/api/aiSettingsApi.ts#L398-L419>
  <https://github.com/tinyhumansai/openhuman/blob/35b7073d6a3afe48ecd2a780fad3b147b35530fc/src/openhuman/inference/provider/factory.rs#L85-L93>
- `provider_for_role` resolves `chat`, `reasoning`, `agentic`, `coding`,
  `memory`, and other workloads from dedicated config fields:
  <https://github.com/tinyhumansai/openhuman/blob/35b7073d6a3afe48ecd2a780fad3b147b35530fc/src/openhuman/inference/provider/factory.rs#L228-L288>
- `agentic_provider` does not participate in BYOK inheritance; v1 must set it
  explicitly when the product promise is that agentic work uses GonkaGate:
  <https://github.com/tinyhumansai/openhuman/blob/35b7073d6a3afe48ecd2a780fad3b147b35530fc/src/openhuman/inference/provider/factory.rs#L248-L260>
- The custom provider factory verifies an active app session before using custom
  providers:
  <https://github.com/tinyhumansai/openhuman/blob/35b7073d6a3afe48ecd2a780fad3b147b35530fc/src/openhuman/inference/provider/factory.rs#L474-L488>
  <https://github.com/tinyhumansai/openhuman/blob/35b7073d6a3afe48ecd2a780fad3b147b35530fc/src/openhuman/inference/provider/factory.rs#L794-L825>
- `RouterProvider` maps OpenHuman abstract tier names such as `reasoning-v1`,
  `agentic-v1`, `coding-v1`, `summarization-v1`, and `vision-v1` to route hints
  or falls back to the configured default model instead of forwarding the raw
  tier name to custom providers:
  <https://github.com/tinyhumansai/openhuman/blob/35b7073d6a3afe48ecd2a780fad3b147b35530fc/src/openhuman/inference/provider/router.rs#L6-L20>
  <https://github.com/tinyhumansai/openhuman/blob/35b7073d6a3afe48ecd2a780fad3b147b35530fc/src/openhuman/inference/provider/router.rs#L94-L143>

## Implementation Consequences

- Use `cloud_providers` and workload provider fields as the main write path.
- Do not write `api_url = "https://api.gonkagate.com/v1"` for v1. That is the
  old direct-provider mental model and risks confusing backend API resolution.
- Do not rely on `model_routes` as the primary tier-routing mechanism.
- Treat `inference_url` as legacy migration compatibility only.
- Preserve all existing user providers; upsert only the `gonkagate` slug.
- If `provider:gonkagate` credentials cannot be written safely, write no secret
  and tell the user to add the key in OpenHuman Settings -> AI.
- Report the OpenHuman session gate separately from GonkaGate credential
  validity. A good GonkaGate key does not remove OpenHuman's app-session
  requirement.

## Release Gate

Before publishing the first config-mutating v1, run one real OpenHuman smoke
test with:

1. a fresh OpenHuman workspace,
2. an active OpenHuman session,
3. a GonkaGate `gp-...` key,
4. `cloud_providers` + workload routes written by this utility,
5. one request that exercises the main reasoning path and one request that
   exercises either coding or agentic routing.

Success means GonkaGate receives concrete model ids, not OpenHuman tier aliases,
and no `gp-...` key appears in CLI output, backups, or logs.
