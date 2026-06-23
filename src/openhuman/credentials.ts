import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  GONKAGATE_CREDENTIAL_PROFILE,
  GONKAGATE_CREDENTIAL_PROVIDER_KEY,
} from "../constants/gateway.js";

export type CredentialPresenceStatus = "missing" | "present" | "unknown";

export interface CredentialInspection {
  authProfilesPath: string;
  status: CredentialPresenceStatus;
}

export interface CredentialOutcome {
  nextAction: string | null;
  profile: string;
  providerKey: string;
  status: "already_present" | "manual_required" | "unknown";
  written: false;
}

export type OpenHumanSessionStatus = "missing" | "present" | "unknown";

export interface OpenHumanSessionInspection {
  authProfilesPath: string;
  status: OpenHumanSessionStatus;
}

export async function inspectGonkaGateCredential(
  configPath: string,
): Promise<CredentialInspection> {
  const authProfilesPath = authProfilesPathForConfig(configPath);
  const data = await readAuthProfiles(authProfilesPath);
  if (data === undefined) {
    return { authProfilesPath, status: "missing" };
  }
  if (data === null) {
    return { authProfilesPath, status: "unknown" };
  }

  return {
    authProfilesPath,
    status: hasProviderProfile(data, GONKAGATE_CREDENTIAL_PROVIDER_KEY)
      ? "present"
      : "missing",
  };
}

export function credentialOutcome(
  inspection: CredentialInspection,
): CredentialOutcome {
  if (inspection.status === "present") {
    return {
      nextAction: null,
      profile: GONKAGATE_CREDENTIAL_PROFILE,
      providerKey: GONKAGATE_CREDENTIAL_PROVIDER_KEY,
      status: "already_present",
      written: false,
    };
  }

  return {
    nextAction:
      "Open OpenHuman Settings -> AI, select GonkaGate, paste your GonkaGate API key, and save it for profile default.",
    profile: GONKAGATE_CREDENTIAL_PROFILE,
    providerKey: GONKAGATE_CREDENTIAL_PROVIDER_KEY,
    status: inspection.status === "unknown" ? "unknown" : "manual_required",
    written: false,
  };
}

export async function inspectOpenHumanSession(
  configPath: string,
): Promise<OpenHumanSessionInspection> {
  const authProfilesPath = authProfilesPathForConfig(configPath);
  const data = await readAuthProfiles(authProfilesPath);
  if (data === undefined) {
    return { authProfilesPath, status: "missing" };
  }
  if (data === null) {
    return { authProfilesPath, status: "unknown" };
  }

  const activeProfile = getActiveProfile(data, "app-session");
  return {
    authProfilesPath,
    status:
      activeProfile !== undefined || hasProviderProfile(data, "app-session")
        ? "present"
        : "missing",
  };
}

function authProfilesPathForConfig(configPath: string): string {
  return join(dirname(configPath), "auth-profiles.json");
}

async function readAuthProfiles(
  path: string,
): Promise<Record<string, unknown> | null | undefined> {
  try {
    const data = JSON.parse(await readFile(path, "utf8")) as unknown;
    return isObject(data) ? data : null;
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return undefined;
    }
    return null;
  }
}

function hasProviderProfile(
  data: Record<string, unknown>,
  provider: string,
): boolean {
  const profiles = data.profiles;
  if (!isObject(profiles)) {
    return false;
  }

  return Object.values(profiles).some(
    (profile) => isObject(profile) && profile.provider === provider,
  );
}

function getActiveProfile(
  data: Record<string, unknown>,
  provider: string,
): string | undefined {
  const activeProfiles = data.active_profiles;
  if (!isObject(activeProfiles)) {
    return undefined;
  }
  const value = activeProfiles[provider];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
