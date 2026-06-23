import { executeCli } from "./cli/execute.js";
import { parseCliArgs } from "./cli/parse.js";
import { renderCliResult } from "./cli/render.js";
import { redactSecrets } from "./util/redact.js";

export async function main(argv = process.argv): Promise<number> {
  const options = parseCliArgs(argv);
  const result = await executeCli(options);
  renderCliResult(result, options);
  return result.ok ? 0 : 1;
}

export function run(): void {
  main().then(
    (exitCode) => {
      process.exitCode = exitCode;
    },
    (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`openhuman-setup failed: ${redactSecrets(message)}`);
      process.exitCode = 1;
    },
  );
}
