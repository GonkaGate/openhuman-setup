import type { CliOptions, CliResult } from "./contracts.js";
import { redactJson } from "../util/redact.js";

export function renderCliResult(result: CliResult, options: CliOptions): void {
  if (options.json) {
    console.log(JSON.stringify(redactJson(result), null, 2));
    return;
  }

  console.log(result.message);
  console.log("");
  console.log(`Config: ${result.config.configPath}`);
  console.log(`Backup: ${result.config.backupPath ?? "none"}`);
  console.log(`Credential: ${result.credentials.status}`);
  console.log(`GonkaGate smoke: ${result.verification.gonkaGateSmoke.status}`);
  console.log(
    `OpenHuman session: ${result.verification.openhumanSession.status}`,
  );
  console.log("");
  console.log("OpenHuman provider:");
  console.log(
    `- ${result.plan.openhuman.cloudProvider.slug}: ${result.plan.openhuman.cloudProvider.endpoint}`,
  );
  console.log("");
  console.log("Workload providers:");
  for (const provider of result.models) {
    console.log(`- ${provider.configField}: ${provider.providerString}`);
  }

  if (result.warnings.length > 0) {
    console.log("");
    console.log("Next actions:");
    for (const warning of result.warnings) {
      console.log(`- ${warning}`);
    }
  }
}
