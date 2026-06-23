# How It Works

The utility:

1. detect the active OpenHuman configuration location
2. collect a GonkaGate API key through a safe input path
3. preserve unrelated OpenHuman TOML config
4. configure GonkaGate as an OpenHuman `cloud_providers` entry
5. write workload provider strings for OpenHuman task tiers
6. verify the effective setup with a real GonkaGate/OpenHuman smoke check

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

chat_provider = "gonkagate:qwen/qwen3-235b-a22b-instruct-2507-fp8"
reasoning_provider = "gonkagate:moonshotai/kimi-k2.6"
agentic_provider = "gonkagate:moonshotai/kimi-k2.6"
coding_provider = "gonkagate:moonshotai/kimi-k2.6"
memory_provider = "gonkagate:qwen/qwen3-235b-a22b-instruct-2507-fp8"
```

The implementation must also handle OpenHuman tier model names such as
`reasoning-v1`, `agentic-v1`, `coding-v1`, `summarization-v1`, and `fast-v1`.

## Verification States

JSON output includes separate machine-readable states for:

- config write and backup path
- credential presence or manual key action
- local config verification
- direct GonkaGate smoke check when a key is available
- OpenHuman app-session presence
