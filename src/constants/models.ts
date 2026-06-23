import { GONKAGATE_PROVIDER_ID } from "./gateway.js";

export interface CuratedModelDefinition {
  displayName: string;
  modelId: string;
  recommended: boolean;
  validationStatus: "validated";
}

export type CuratedModelRegistry = Record<string, CuratedModelDefinition>;

export const CURATED_MODEL_REGISTRY = Object.freeze({
  "qwen3-235b-a22b-instruct-2507-fp8": {
    displayName: "Qwen3 235B A22B Instruct 2507 FP8",
    modelId: "qwen/qwen3-235b-a22b-instruct-2507-fp8",
    recommended: false,
    validationStatus: "validated",
  },
  "kimi-k2.6": {
    displayName: "Kimi K2.6",
    modelId: "moonshotai/kimi-k2.6",
    recommended: true,
    validationStatus: "validated",
  },
} as const satisfies CuratedModelRegistry);

export type CuratedModelKey = keyof typeof CURATED_MODEL_REGISTRY;

export interface CuratedModelRecord extends CuratedModelDefinition {
  key: CuratedModelKey;
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

const recommendedGeneralModel = "moonshotai/kimi-k2.6";
const recommendedFastModel = "qwen/qwen3-235b-a22b-instruct-2507-fp8";

export const DEFAULT_OPENHUMAN_WORKLOAD_PROVIDERS = Object.freeze([
  {
    configField: "chat_provider",
    model: recommendedFastModel,
    providerString: `${GONKAGATE_PROVIDER_ID}:${recommendedFastModel}`,
    workload: "chat",
  },
  {
    configField: "reasoning_provider",
    model: recommendedGeneralModel,
    providerString: `${GONKAGATE_PROVIDER_ID}:${recommendedGeneralModel}`,
    workload: "reasoning",
  },
  {
    configField: "agentic_provider",
    model: recommendedGeneralModel,
    providerString: `${GONKAGATE_PROVIDER_ID}:${recommendedGeneralModel}`,
    workload: "agentic",
  },
  {
    configField: "coding_provider",
    model: recommendedGeneralModel,
    providerString: `${GONKAGATE_PROVIDER_ID}:${recommendedGeneralModel}`,
    workload: "coding",
  },
  {
    configField: "memory_provider",
    model: recommendedFastModel,
    providerString: `${GONKAGATE_PROVIDER_ID}:${recommendedFastModel}`,
    workload: "memory",
  },
] as const satisfies readonly WorkloadProvider[]);

const defaultModelKeys = {
  agentic: "kimi-k2.6",
  chat: "qwen3-235b-a22b-instruct-2507-fp8",
  coding: "kimi-k2.6",
  memory: "qwen3-235b-a22b-instruct-2507-fp8",
  reasoning: "kimi-k2.6",
} as const satisfies Record<WorkloadId, CuratedModelKey>;

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

export function getValidatedModelKeys(): CuratedModelKey[] {
  return Object.keys(CURATED_MODEL_REGISTRY) as CuratedModelKey[];
}

export function getCuratedModelByKey(
  key: string | undefined,
): CuratedModelRecord | undefined {
  if (key === undefined || !(key in CURATED_MODEL_REGISTRY)) {
    return undefined;
  }

  const modelKey = key as CuratedModelKey;
  return {
    ...CURATED_MODEL_REGISTRY[modelKey],
    key: modelKey,
  };
}

export function getRecommendedValidatedModel(
  requestedKey?: string,
): CuratedModelRecord {
  const requested = getCuratedModelByKey(requestedKey);
  if (requested !== undefined) {
    return requested;
  }

  for (const key of getValidatedModelKeys()) {
    const model = CURATED_MODEL_REGISTRY[key];
    if (model.recommended) {
      return {
        ...model,
        key,
      };
    }
  }

  throw new Error("No recommended validated GonkaGate model is configured.");
}

export function resolveOpenHumanWorkloadProviders(
  input: ModelSelectionInput = {},
): WorkloadProvider[] {
  const keyFor = (workload: WorkloadId): string | undefined => {
    switch (workload) {
      case "agentic":
        return input.agenticModelKey ?? input.globalModelKey;
      case "coding":
        return input.codingModelKey ?? input.globalModelKey;
      case "memory":
        return input.summarizationModelKey ?? input.globalModelKey;
      case "reasoning":
        return input.reasoningModelKey ?? input.globalModelKey;
      case "chat":
        return input.globalModelKey;
    }
  };

  return workloadOrder.map((workload) => {
    const key = keyFor(workload) ?? defaultModelKeys[workload];
    const model = getRequiredCuratedModel(key).modelId;
    return {
      configField: workloadFields[workload],
      model,
      providerString: `${GONKAGATE_PROVIDER_ID}:${model}`,
      workload,
    };
  });
}

function getRequiredCuratedModel(key: string): CuratedModelRecord {
  const model = getCuratedModelByKey(key);
  if (model !== undefined) {
    return model;
  }

  throw new Error(
    `Unknown GonkaGate model key. Valid choices: ${getValidatedModelKeys().join(", ")}`,
  );
}
