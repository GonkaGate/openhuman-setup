import { Command, Option } from "commander";
import { CONTRACT_METADATA } from "../constants/contract.js";
import { getValidatedModelKeys } from "../constants/models.js";
import type { CliOptions } from "./contracts.js";

export function parseCliArgs(argv: readonly string[]): CliOptions {
  if (argv.some((arg) => arg === "--api-key" || arg.startsWith("--api-key="))) {
    throw new Error(
      "plain --api-key is not supported; use hidden prompt, GONKAGATE_API_KEY, or --api-key-stdin",
    );
  }

  const command = new Command();

  command
    .name(CONTRACT_METADATA.binName)
    .description(CONTRACT_METADATA.description)
    .version(CONTRACT_METADATA.cliVersion)
    .allowExcessArguments(false)
    .option("--api-key-stdin", "read the GonkaGate API key from stdin")
    .option("--json", "render machine-readable JSON output")
    .option("--yes", "accept safe defaults for non-interactive setup")
    .addOption(
      new Option("--model <key>", "curated GonkaGate model key").choices(
        getValidatedModelKeys(),
      ),
    )
    .addOption(
      new Option(
        "--reasoning-model <key>",
        "curated model key for OpenHuman reasoning workloads",
      ).choices(getValidatedModelKeys()),
    )
    .addOption(
      new Option(
        "--agentic-model <key>",
        "curated model key for OpenHuman agentic workloads",
      ).choices(getValidatedModelKeys()),
    )
    .addOption(
      new Option(
        "--coding-model <key>",
        "curated model key for OpenHuman coding workloads",
      ).choices(getValidatedModelKeys()),
    )
    .addOption(
      new Option(
        "--summarization-model <key>",
        "curated model key for OpenHuman summarization workloads",
      ).choices(getValidatedModelKeys()),
    );

  command.parse(argv, { from: "node" });
  const parsed = command.opts<{
    agenticModel?: string;
    apiKeyStdin?: boolean;
    codingModel?: string;
    json?: boolean;
    model?: string;
    reasoningModel?: string;
    summarizationModel?: string;
    yes?: boolean;
  }>();

  const options: CliOptions = {
    apiKeyStdin: parsed.apiKeyStdin ?? false,
    cwd: process.cwd(),
    json: parsed.json ?? false,
    yes: parsed.yes ?? false,
  };

  if (parsed.model !== undefined) {
    options.modelKey = parsed.model;
  }
  if (parsed.reasoningModel !== undefined) {
    options.reasoningModelKey = parsed.reasoningModel;
  }
  if (parsed.agenticModel !== undefined) {
    options.agenticModelKey = parsed.agenticModel;
  }
  if (parsed.codingModel !== undefined) {
    options.codingModelKey = parsed.codingModel;
  }
  if (parsed.summarizationModel !== undefined) {
    options.summarizationModelKey = parsed.summarizationModel;
  }

  return options;
}
