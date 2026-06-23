import { parse, stringify } from "smol-toml";
import {
  GONKAGATE_AUTH_STYLE,
  GONKAGATE_BASE_URL,
  GONKAGATE_PROVIDER_ID,
  GONKAGATE_PROVIDER_NAME,
} from "../constants/gateway.js";
import type { WorkloadProvider } from "../constants/models.js";

type TomlObject = Record<string, unknown>;

export function mergeGonkaGateConfig(
  contents: string,
  workloadProviders: readonly WorkloadProvider[],
): string {
  const config = parseConfig(contents);
  const providers = getCloudProviders(config);
  config.cloud_providers = [
    ...providers.filter((provider) => provider.slug !== GONKAGATE_PROVIDER_ID),
    {
      auth_style: GONKAGATE_AUTH_STYLE,
      endpoint: GONKAGATE_BASE_URL,
      label: GONKAGATE_PROVIDER_NAME,
      slug: GONKAGATE_PROVIDER_ID,
    },
  ];

  for (const provider of workloadProviders) {
    config[provider.configField] = provider.providerString;
  }

  const rendered = stringify(config);
  return rendered.endsWith("\n") ? rendered : `${rendered}\n`;
}

export function verifyGonkaGateConfig(
  contents: string,
  workloadProviders: readonly WorkloadProvider[],
): string[] {
  const config = parseConfig(contents);
  const providers = getCloudProviders(config).filter(
    (provider) => provider.slug === GONKAGATE_PROVIDER_ID,
  );
  const errors: string[] = [];

  if (providers.length !== 1) {
    errors.push(
      `expected exactly one ${GONKAGATE_PROVIDER_ID} cloud_providers entry`,
    );
  } else {
    const provider = providers[0];
    if (provider === undefined) {
      errors.push(
        `expected exactly one ${GONKAGATE_PROVIDER_ID} cloud_providers entry`,
      );
      return errors;
    }
    if (provider.endpoint !== GONKAGATE_BASE_URL) {
      errors.push("GonkaGate cloud provider endpoint is wrong");
    }
    if (provider.auth_style !== GONKAGATE_AUTH_STYLE) {
      errors.push("GonkaGate cloud provider auth_style is wrong");
    }
  }

  for (const provider of workloadProviders) {
    if (config[provider.configField] !== provider.providerString) {
      errors.push(`${provider.configField} is not routed to GonkaGate`);
    }
  }

  return errors;
}

function parseConfig(contents: string): TomlObject {
  if (contents.trim().length === 0) {
    return {};
  }
  const config = parse(contents);
  if (!isObject(config)) {
    throw new Error("OpenHuman config TOML root must be a table");
  }
  return config;
}

function getCloudProviders(config: TomlObject): TomlObject[] {
  const value = config.cloud_providers;
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value) || !value.every(isObject)) {
    throw new Error("OpenHuman cloud_providers must be an array of tables");
  }
  return value;
}

function isObject(value: unknown): value is TomlObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
