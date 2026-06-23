import { password } from "@inquirer/prompts";
import type { CliOptions } from "../cli/contracts.js";

export type ApiKeySource = "env" | "none" | "prompt" | "stdin";

export interface ApiKeySecret {
  source: Exclude<ApiKeySource, "none">;
  value: string;
}

export interface SecretRuntime {
  env?: NodeJS.ProcessEnv;
  isInteractive?: boolean;
  promptPassword?: () => Promise<string>;
  readStdin?: () => Promise<string>;
}

export async function collectApiKey(
  options: Pick<CliOptions, "apiKeyStdin" | "json" | "yes">,
  runtime: SecretRuntime = {},
): Promise<ApiKeySecret | undefined> {
  const envKey = cleanKey((runtime.env ?? process.env).GONKAGATE_API_KEY);
  if (envKey !== undefined) {
    return { source: "env", value: envKey };
  }

  if (options.apiKeyStdin) {
    const stdinKey = cleanKey(await readStdin(runtime.readStdin));
    if (stdinKey !== undefined) {
      return { source: "stdin", value: stdinKey };
    }
    throw new Error("--api-key-stdin was set but stdin was empty");
  }

  const canPrompt =
    !options.yes &&
    !options.json &&
    (runtime.isInteractive ?? (process.stdin.isTTY && process.stdout.isTTY));
  if (!canPrompt) {
    return undefined;
  }

  const promptPassword =
    runtime.promptPassword ??
    (() => password({ message: "GonkaGate API key (input hidden)" }));
  const prompted = cleanKey(await promptPassword());
  return prompted === undefined
    ? undefined
    : { source: "prompt", value: prompted };
}

async function readStdin(
  customRead: (() => Promise<string>) | undefined,
): Promise<string> {
  if (customRead !== undefined) {
    return customRead();
  }

  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => {
      resolve(data);
    });
    process.stdin.on("error", reject);
  });
}

function cleanKey(value: string | undefined): string | undefined {
  const key = value?.trim();
  return key === undefined || key.length === 0 ? undefined : key;
}
