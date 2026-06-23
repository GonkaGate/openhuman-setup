import { access, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join } from "node:path";
import { parse } from "smol-toml";

export type ConfigDiscoverySource =
  | "OPENHUMAN_WORKSPACE"
  | "active_user.toml"
  | "active_workspace.toml"
  | "pre-login";

export interface DiscoveryAttempt {
  exists: boolean;
  path: string;
  source:
    | "OPENHUMAN_WORKSPACE"
    | "app-env-root"
    | "active_user.toml"
    | "active_workspace.toml"
    | "pre-login";
}

export interface ConfigDiscoveryResult {
  activeUserId?: string;
  attemptedPaths: DiscoveryAttempt[];
  configPath: string;
  rootDir: string;
  source: ConfigDiscoverySource;
  workspaceDir: string;
}

export interface ConfigDiscoveryInput {
  env?: NodeJS.ProcessEnv;
  homeDir?: string;
}

export async function discoverOpenHumanConfig(
  input: ConfigDiscoveryInput = {},
): Promise<ConfigDiscoveryResult> {
  const env = input.env ?? process.env;
  const home = input.homeDir ?? homedir();
  const attempts: DiscoveryAttempt[] = [];
  const workspaceOverride = trimmed(env.OPENHUMAN_WORKSPACE);

  if (workspaceOverride !== undefined) {
    const resolved = await resolveWorkspaceOverride(
      workspaceOverride,
      attempts,
    );
    return {
      attemptedPaths: attempts,
      configPath: join(resolved.configDir, "config.toml"),
      rootDir: resolved.configDir,
      source: "OPENHUMAN_WORKSPACE",
      workspaceDir: resolved.workspaceDir,
    };
  }

  const rootDir = join(home, appEnvRootName(env.OPENHUMAN_APP_ENV));
  await recordAttempt(attempts, "app-env-root", rootDir);

  const activeUserPath = join(rootDir, "active_user.toml");
  if (await recordAttempt(attempts, "active_user.toml", activeUserPath)) {
    const userId = await readActiveUserId(activeUserPath);
    if (userId !== undefined) {
      const userDir = join(rootDir, "users", userId);
      return {
        activeUserId: userId,
        attemptedPaths: attempts,
        configPath: join(userDir, "config.toml"),
        rootDir,
        source: "active_user.toml",
        workspaceDir: join(userDir, "workspace"),
      };
    }
  }

  const activeWorkspacePath = join(rootDir, "active_workspace.toml");
  if (
    await recordAttempt(attempts, "active_workspace.toml", activeWorkspacePath)
  ) {
    const configDir = await readActiveWorkspaceConfigDir(
      activeWorkspacePath,
      rootDir,
    );
    if (configDir !== undefined) {
      return {
        attemptedPaths: attempts,
        configPath: join(configDir, "config.toml"),
        rootDir,
        source: "active_workspace.toml",
        workspaceDir: join(configDir, "workspace"),
      };
    }
  }

  const localDir = join(rootDir, "users", "local");
  await recordAttempt(attempts, "pre-login", join(localDir, "config.toml"));
  return {
    attemptedPaths: attempts,
    configPath: join(localDir, "config.toml"),
    rootDir,
    source: "pre-login",
    workspaceDir: join(localDir, "workspace"),
  };
}

async function resolveWorkspaceOverride(
  workspacePath: string,
  attempts: DiscoveryAttempt[],
): Promise<{ configDir: string; workspaceDir: string }> {
  const directConfig = join(workspacePath, "config.toml");
  if (await recordAttempt(attempts, "OPENHUMAN_WORKSPACE", directConfig)) {
    return {
      configDir: workspacePath,
      workspaceDir: join(workspacePath, "workspace"),
    };
  }

  const legacyDir = join(dirname(workspacePath), ".openhuman");
  const legacyConfig = join(legacyDir, "config.toml");
  if (await recordAttempt(attempts, "OPENHUMAN_WORKSPACE", legacyConfig)) {
    return { configDir: legacyDir, workspaceDir: workspacePath };
  }

  if (basename(workspacePath) === "workspace") {
    return { configDir: legacyDir, workspaceDir: workspacePath };
  }

  return {
    configDir: workspacePath,
    workspaceDir: join(workspacePath, "workspace"),
  };
}

async function recordAttempt(
  attempts: DiscoveryAttempt[],
  source: DiscoveryAttempt["source"],
  path: string,
): Promise<boolean> {
  const exists = await pathExists(path);
  attempts.push({ exists, path, source });
  return exists;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readActiveUserId(path: string): Promise<string | undefined> {
  try {
    const data = parse(await readFile(path, "utf8")) as Record<string, unknown>;
    const value = data.user_id;
    if (typeof value !== "string") {
      return undefined;
    }
    return validateUserId(value);
  } catch {
    return undefined;
  }
}

async function readActiveWorkspaceConfigDir(
  path: string,
  rootDir: string,
): Promise<string | undefined> {
  try {
    const data = parse(await readFile(path, "utf8")) as Record<string, unknown>;
    const raw = data.config_dir;
    if (typeof raw !== "string") {
      return undefined;
    }
    const value = trimmed(raw);
    if (value === undefined) {
      return undefined;
    }
    return isAbsolute(value) ? value : join(rootDir, value);
  } catch {
    return undefined;
  }
}

function appEnvRootName(
  value: string | undefined,
): ".openhuman" | ".openhuman-staging" {
  return value?.trim().toLowerCase() === "staging"
    ? ".openhuman-staging"
    : ".openhuman";
}

function trimmed(value: string | undefined): string | undefined {
  const result = value?.trim();
  return result === undefined || result.length === 0 ? undefined : result;
}

function validateUserId(value: string): string | undefined {
  const userId = value.trim();
  if (userId.length === 0 || userId === "." || userId === "..") {
    return undefined;
  }
  if (
    userId.includes("..") ||
    /[\\/\0]/u.test(userId) ||
    /[\p{C}]/u.test(userId) ||
    !/^[A-Za-z0-9._@-]+$/u.test(userId)
  ) {
    return undefined;
  }
  return userId;
}
