import {
  chmod,
  copyFile,
  mkdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, join } from "node:path";

export interface ConfigWriteResult {
  backupPath: string | null;
  configPath: string;
  wrote: true;
}

export async function readConfigIfExists(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return "";
    }
    throw error;
  }
}

export async function writeConfigAtomically(
  configPath: string,
  contents: string,
  now = new Date(),
): Promise<ConfigWriteResult> {
  await mkdir(dirname(configPath), { recursive: true });
  const existing = await stat(configPath).catch((error: unknown) => {
    if (isNodeError(error) && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  });
  const mode = existing?.mode ?? 0o600;
  const backupPath =
    existing === undefined
      ? null
      : `${configPath}.gonkagate-${timestamp(now)}.bak`;

  if (backupPath !== null) {
    await copyFile(configPath, backupPath);
    await chmod(backupPath, mode);
  }

  const tempPath = join(
    dirname(configPath),
    `.${basename(configPath)}.${process.pid}.${Date.now()}.tmp`,
  );
  try {
    await writeFile(tempPath, contents, { mode });
    await rename(tempPath, configPath);
  } catch (error) {
    await rm(tempPath, { force: true });
    throw error;
  }

  await chmod(configPath, mode);
  return { backupPath, configPath, wrote: true };
}

function timestamp(date: Date): string {
  return date.toISOString().replaceAll(/[:.]/g, "-");
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
