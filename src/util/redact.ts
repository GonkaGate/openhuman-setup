const GONKAGATE_KEY_PATTERN = /gp-[A-Za-z0-9._-]+/g;

export function redactSecrets(value: string): string {
  return value.replaceAll(GONKAGATE_KEY_PATTERN, "gp-...REDACTED");
}

export function redactJson<T>(value: T): T {
  return JSON.parse(redactSecrets(JSON.stringify(value))) as T;
}
