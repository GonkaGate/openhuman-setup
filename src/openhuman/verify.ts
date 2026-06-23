import { readFile } from "node:fs/promises";
import { GONKAGATE_CHAT_COMPLETIONS_URL } from "../constants/gateway.js";
import type { WorkloadProvider } from "../constants/models.js";
import { redactSecrets } from "../util/redact.js";
import { verifyGonkaGateConfig } from "./toml.js";

export interface LocalConfigVerification {
  errors: string[];
  ok: boolean;
  status: "failed" | "passed";
}

export interface SmokeCheckResult {
  error?: string;
  model: string;
  status: "failed" | "passed" | "skipped";
  statusCode?: number;
}

export async function verifyLocalConfig(
  configPath: string,
  workloadProviders: readonly WorkloadProvider[],
): Promise<LocalConfigVerification> {
  const errors = verifyGonkaGateConfig(
    await readFile(configPath, "utf8"),
    workloadProviders,
  );
  return {
    errors,
    ok: errors.length === 0,
    status: errors.length === 0 ? "passed" : "failed",
  };
}

export async function runGonkaGateSmoke(
  apiKey: string | undefined,
  model: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SmokeCheckResult> {
  if (apiKey === undefined) {
    return { model, status: "skipped" };
  }

  try {
    const response = await fetchImpl(GONKAGATE_CHAT_COMPLETIONS_URL, {
      body: JSON.stringify({
        max_tokens: 1,
        messages: [{ content: "Return ok.", role: "user" }],
        model,
      }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: AbortSignal.timeout(20_000),
    });

    if (response.ok) {
      return { model, status: "passed", statusCode: response.status };
    }

    const body = redactSecrets((await response.text()).slice(0, 500));
    return {
      error: body.length === 0 ? response.statusText : body,
      model,
      status: "failed",
      statusCode: response.status,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { error: redactSecrets(message), model, status: "failed" };
  }
}
