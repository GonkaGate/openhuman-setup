import { select } from "@inquirer/prompts";
import { CONTRACT_METADATA } from "../constants/contract.js";
import {
  GONKAGATE_AUTH_STYLE,
  GONKAGATE_BASE_URL,
  GONKAGATE_CHAT_COMPLETIONS_URL,
  GONKAGATE_CREDENTIAL_PROFILE,
  GONKAGATE_CREDENTIAL_PROVIDER_KEY,
  GONKAGATE_PROVIDER_ID,
  GONKAGATE_PROVIDER_NAME,
} from "../constants/gateway.js";
import {
  fetchGonkaGateModels,
  getDefaultGonkaGateModel,
  resolveOpenHumanWorkloadProviders,
  type GonkaGateModel,
} from "../constants/models.js";
import {
  credentialOutcome,
  inspectGonkaGateCredential,
  inspectOpenHumanSession,
} from "../openhuman/credentials.js";
import { discoverOpenHumanConfig } from "../openhuman/discovery.js";
import { collectApiKey, type SecretRuntime } from "../openhuman/secrets.js";
import { mergeGonkaGateConfig } from "../openhuman/toml.js";
import { verifyLocalConfig, runGonkaGateSmoke } from "../openhuman/verify.js";
import {
  readConfigIfExists,
  writeConfigAtomically,
} from "../openhuman/write.js";
import type { CliOptions, CliResult } from "./contracts.js";

export interface CliRuntime extends SecretRuntime {
  fetch?: typeof fetch;
  now?: () => Date;
  promptModel?: (models: readonly GonkaGateModel[]) => Promise<string>;
}

export async function executeCli(
  options: CliOptions,
  runtime: CliRuntime = {},
): Promise<CliResult> {
  const apiKey = await collectApiKey(options, runtime);
  if (apiKey === undefined) {
    throw new Error(
      "GonkaGate API key is required to fetch available models; use hidden prompt, GONKAGATE_API_KEY, or --api-key-stdin",
    );
  }

  const liveModels = await fetchGonkaGateModels(apiKey.value, runtime.fetch);
  const globalModelKey = await collectGlobalModelKey(
    options,
    runtime,
    liveModels,
  );
  const model = getDefaultGonkaGateModel(liveModels, globalModelKey);
  const workloadProviders = resolveOpenHumanWorkloadProviders(
    omitUndefined({
      agenticModelKey: options.agenticModelKey,
      codingModelKey: options.codingModelKey,
      globalModelKey,
      reasoningModelKey: options.reasoningModelKey,
      summarizationModelKey: options.summarizationModelKey,
    }),
    liveModels,
  );
  const discovery = await discoverOpenHumanConfig(
    runtime.env === undefined ? {} : { env: runtime.env },
  );
  const existingConfig = await readConfigIfExists(discovery.configPath);
  const mergedConfig = mergeGonkaGateConfig(existingConfig, workloadProviders);
  const config = await writeConfigAtomically(
    discovery.configPath,
    mergedConfig,
    runtime.now?.(),
  );
  const credentialInspection = await inspectGonkaGateCredential(
    discovery.configPath,
  );
  const credentials = credentialOutcome(credentialInspection);
  const localConfig = await verifyLocalConfig(
    discovery.configPath,
    workloadProviders,
  );
  const reasoningModel =
    workloadProviders.find((provider) => provider.workload === "reasoning")
      ?.model ?? model.id;
  const gonkaGateSmoke = await runGonkaGateSmoke(
    apiKey.value,
    reasoningModel,
    runtime.fetch,
  );
  const openhumanSession = await inspectOpenHumanSession(discovery.configPath);
  const ok = localConfig.ok && gonkaGateSmoke.status !== "failed";
  const needsAction =
    credentials.status !== "already_present" ||
    openhumanSession.status !== "present";

  return {
    config,
    credentials: {
      ...credentials,
      inspectedStatus: credentialInspection.status,
    },
    discovery,
    message: ok
      ? "OpenHuman GonkaGate config written."
      : "OpenHuman GonkaGate setup did not verify cleanly.",
    models: workloadProviders.map((provider) => ({ ...provider })),
    ok,
    plan: {
      packageName: CONTRACT_METADATA.packageName,
      publicEntrypoint: CONTRACT_METADATA.publicEntrypoint,
      target: {
        baseUrl: GONKAGATE_BASE_URL,
        chatCompletionsUrl: GONKAGATE_CHAT_COMPLETIONS_URL,
        providerId: GONKAGATE_PROVIDER_ID,
      },
      openhuman: {
        cloudProvider: {
          authStyle: GONKAGATE_AUTH_STYLE,
          endpoint: GONKAGATE_BASE_URL,
          label: GONKAGATE_PROVIDER_NAME,
          slug: GONKAGATE_PROVIDER_ID,
        },
        configPathStrategy:
          "Resolve OpenHuman config.toml via OPENHUMAN_WORKSPACE, active user/workspace markers, then default ~/.openhuman users.",
        credential: {
          profile: GONKAGATE_CREDENTIAL_PROFILE,
          providerKey: GONKAGATE_CREDENTIAL_PROVIDER_KEY,
        },
        defaultModel: model.id,
        workloadProviders: workloadProviders.map((provider) => ({
          ...provider,
        })),
      },
    },
    status: ok ? (needsAction ? "action_required" : "configured") : "failed",
    verification: {
      gonkaGateSmoke,
      localConfig,
      openhumanSession: {
        status: openhumanSession.status,
      },
    },
    warnings: buildWarnings(credentials, openhumanSession.status),
  };
}

async function collectGlobalModelKey(
  options: CliOptions,
  runtime: CliRuntime,
  models: readonly GonkaGateModel[],
): Promise<string | undefined> {
  if (options.modelKey !== undefined || hasWorkloadOverride(options)) {
    return options.modelKey;
  }

  const canPrompt =
    !options.yes &&
    !options.json &&
    (runtime.isInteractive ?? (process.stdin.isTTY && process.stdout.isTTY));
  if (!canPrompt) {
    return undefined;
  }

  if (runtime.promptModel !== undefined) {
    return runtime.promptModel(models);
  }

  return select({
    choices: models.map((model) => ({
      name: model.name === undefined ? model.id : `${model.name} (${model.id})`,
      value: model.id,
    })),
    message: "GonkaGate model",
  });
}

function hasWorkloadOverride(options: CliOptions): boolean {
  return (
    options.agenticModelKey !== undefined ||
    options.codingModelKey !== undefined ||
    options.reasoningModelKey !== undefined ||
    options.summarizationModelKey !== undefined
  );
}

function buildWarnings(
  credentials: ReturnType<typeof credentialOutcome>,
  sessionStatus: "missing" | "present" | "unknown",
): string[] {
  const warnings: string[] = [];
  if (
    credentials.status !== "already_present" &&
    credentials.nextAction !== null
  ) {
    warnings.push(credentials.nextAction);
  }
  if (sessionStatus !== "present") {
    warnings.push("OpenHuman must be signed in before custom providers run.");
  }
  return warnings;
}

function omitUndefined<T extends Record<string, string | undefined>>(
  value: T,
): { [K in keyof T]?: string } {
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    ),
  ) as { [K in keyof T]?: string };
}
