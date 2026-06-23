import type { ConfigDiscoveryResult } from "../openhuman/discovery.js";
import type {
  CredentialOutcome,
  CredentialPresenceStatus,
  OpenHumanSessionStatus,
} from "../openhuman/credentials.js";
import type {
  LocalConfigVerification,
  SmokeCheckResult,
} from "../openhuman/verify.js";
import type { ConfigWriteResult } from "../openhuman/write.js";

export interface CliOptions {
  agenticModelKey?: string;
  apiKeyStdin: boolean;
  codingModelKey?: string;
  cwd: string;
  json: boolean;
  modelKey?: string;
  reasoningModelKey?: string;
  summarizationModelKey?: string;
  yes: boolean;
}

export interface CliResult {
  config: ConfigWriteResult;
  credentials: CredentialOutcome & {
    inspectedStatus: CredentialPresenceStatus;
  };
  discovery: ConfigDiscoveryResult;
  message: string;
  models: OpenHumanSetupPlan["openhuman"]["workloadProviders"];
  ok: boolean;
  plan: OpenHumanSetupPlan;
  status: "action_required" | "configured" | "failed";
  verification: {
    gonkaGateSmoke: SmokeCheckResult;
    localConfig: LocalConfigVerification;
    openhumanSession: {
      status: OpenHumanSessionStatus;
    };
  };
  warnings: string[];
}

export interface OpenHumanSetupPlan {
  packageName: string;
  publicEntrypoint: string;
  target: {
    baseUrl: string;
    chatCompletionsUrl: string;
    providerId: string;
  };
  openhuman: {
    cloudProvider: {
      authStyle: string;
      endpoint: string;
      label: string;
      slug: string;
    };
    configPathStrategy: string;
    credential: {
      profile: string;
      providerKey: string;
    };
    defaultModel: string;
    workloadProviders: Array<{
      configField: string;
      model: string;
      providerString: string;
      workload: string;
    }>;
  };
}
