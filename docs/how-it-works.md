# How It Works

The utility:

1. detect the active OpenHuman configuration location
2. collect a GonkaGate API key through a safe input path
3. fetch `GET https://api.gonkagate.com/v1/models` with Bearer auth
4. preserve unrelated OpenHuman TOML config
5. configure GonkaGate as an OpenHuman `cloud_providers` entry
6. write workload provider strings using only fetched live model ids
7. verify the effective setup with a real GonkaGate/OpenHuman smoke check

Direct OpenHuman credential-store mutation is intentionally skipped. Current
OpenHuman writes provider secrets through runtime keychain or encrypted JSON
policy, so this standalone CLI reports the manual Settings -> AI key step
instead of guessing at `auth-profiles.json`.

## Target Configuration

The target provider settings are:

```toml
[[cloud_providers]]
slug = "gonkagate"
label = "GonkaGate"
endpoint = "https://api.gonkagate.com/v1"
auth_style = "bearer"

chat_provider = "gonkagate:<live-model-id>"
reasoning_provider = "gonkagate:<live-model-id>"
agentic_provider = "gonkagate:<live-model-id>"
coding_provider = "gonkagate:<live-model-id>"
memory_provider = "gonkagate:<live-model-id>"
```

The concrete model id comes from the authenticated `/v1/models` response, not a
repository catalog.

The implementation must also handle OpenHuman tier model names such as
`reasoning-v1`, `agentic-v1`, `coding-v1`, `summarization-v1`, and `fast-v1`.

## Verification States

JSON output includes separate machine-readable states for:

- config write and backup path
- credential presence or manual key action
- local config verification
- direct GonkaGate smoke check
- OpenHuman app-session presence
