# Security

The setup utility handles a GonkaGate API key and must keep the security bar
close to the existing GonkaGate setup tools.

## Requirements

- never print the `gp-...` key
- never accept the key through a plain `--api-key` flag
- the CLI must not accept a plain `--api-key` flag
- support safe inputs only: hidden prompt, `GONKAGATE_API_KEY`, and
  `--api-key-stdin`
- preserve unrelated OpenHuman configuration
- create backups before managed rewrites
- redact secret-bearing diagnostics and error messages

## Credential Storage

Current OpenHuman stores custom provider API keys through `auth-profiles.json`
under provider keys such as `provider:gonkagate`. The implementation should use
that native path only when it can do so safely.

Current OpenHuman credential writes depend on runtime keychain consent, keychain
availability, encrypted JSON fallback, and `auth-profiles.lock`. This standalone
CLI therefore does not write `auth-profiles.json` directly. It reads credential
presence when possible, never writes the key, and tells the user to add the
GonkaGate key in OpenHuman Settings -> AI for profile `default`.
