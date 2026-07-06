import { GONKAGATE_MODELS_URL, GONKAGATE_PROVIDER_ID } from "./gateway.js";
import { redactSecrets } from "../util/redact.js";

export interface GonkaGateModel {
  id: string;
  name?: string;
}

export type WorkloadId = "chat" | "reasoning" | "agentic" | "coding" | "memory";

export interface WorkloadProvider {
  configField:
    | "chat_provider"
    | "reasoning_provider"
    | "agentic_provider"
    | "coding_provider"
    | "memory_provider";
  model: string;
  providerString: string;
  workload: WorkloadId;
}

export interface ModelSelectionInput {
  agenticModelKey?: string;
  codingModelKey?: string;
  globalModelKey?: string;
  reasoningModelKey?: string;
  summarizationModelKey?: string;
}

const workloadFields = {
  agentic: "agentic_provider",
  chat: "chat_provider",
  coding: "coding_provider",
  memory: "memory_provider",
  reasoning: "reasoning_provider",
} as const satisfies Record<WorkloadId, WorkloadProvider["configField"]>;

const workloadOrder = [
  "chat",
  "reasoning",
  "agentic",
  "coding",
  "memory",
] as const satisfies readonly WorkloadId[];

export async function fetchGonkaGateModels(
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<GonkaGateModel[]> {
  const response = await fetchImpl(GONKAGATE_MODELS_URL, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    method: "GET",
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    const body = redactSecrets((await response.text()).slice(0, 500));
    const detail = body.length === 0 ? response.statusText : body;
    throw new Error(
      `Failed to fetch GonkaGate models (${response.status}): ${detail}`,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `GonkaGate models response was not valid JSON: ${redactSecrets(message)}`,
    );
  }

  return parseGonkaGateModels(payload);
}

export function parseGonkaGateModels(payload: unknown): GonkaGateModel[] {
  if (!isRecord(payload) || !Array.isArray(payload.data)) {
    throw new Error("GonkaGate models response was invalid.");
  }

  const seen = new Set<string>();
  const models: GonkaGateModel[] = [];

  for (const item of payload.data) {
    if (!isRecord(item) || typeof item.id !== "string") {
      throw new Error("GonkaGate models response contained an invalid model.");
    }

    const id = item.id.trim();
    if (id.length === 0) {
      throw new Error("GonkaGate models response contained an empty model id.");
    }

    if (seen.has(id)) {
      continue;
    }

    seen.add(id);
    const name =
      typeof item.name === "string" && item.name.trim().length > 0
        ? item.name.trim()
        : undefined;
    const model: GonkaGateModel = { id };
    if (name !== undefined) {
      model.name = name;
    }
    models.push(model);
  }

  if (models.length === 0) {
    throw new Error("GonkaGate models response did not include any models.");
  }

  return models;
}

export function getDefaultGonkaGateModel(
  models: readonly GonkaGateModel[],
  requestedId?: string,
): GonkaGateModel {
  if (requestedId !== undefined) {
    return getRequiredGonkaGateModel(models, requestedId);
  }

  const model = models[0];
  if (model === undefined) {
    throw new Error("GonkaGate models response did not include any models.");
  }
  return model;
}

export function resolveOpenHumanWorkloadProviders(
  input: ModelSelectionInput = {},
  models: readonly GonkaGateModel[],
): WorkloadProvider[] {
  const defaultModel = getDefaultGonkaGateModel(
    models,
    input.globalModelKey,
  ).id;
  const idFor = (workload: WorkloadId): string => {
    switch (workload) {
      case "agentic":
        return input.agenticModelKey ?? defaultModel;
      case "coding":
        return input.codingModelKey ?? defaultModel;
      case "memory":
        return input.summarizationModelKey ?? defaultModel;
      case "reasoning":
        return input.reasoningModelKey ?? defaultModel;
      case "chat":
        return defaultModel;
    }
  };

  return workloadOrder.map((workload) => {
    const model = getRequiredGonkaGateModel(models, idFor(workload)).id;
    return {
      configField: workloadFields[workload],
      model,
      providerString: `${GONKAGATE_PROVIDER_ID}:${model}`,
      workload,
    };
  });
}

function getRequiredGonkaGateModel(
  models: readonly GonkaGateModel[],
  id: string,
): GonkaGateModel {
  const model = models.find((candidate) => candidate.id === id);
  if (model !== undefined) {
    return model;
  }

  throw new Error(
    `Unknown GonkaGate model id. Valid choices: ${models
      .map((candidate) => candidate.id)
      .join(", ")}`,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
