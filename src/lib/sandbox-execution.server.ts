import { Sandbox } from "e2b";

type SandboxExecutionResult = {
  finished: boolean;
  success: boolean;
  stdout: string;
  stderr: string;
  error?: string;
  exitCode?: number | null;
};

type SandboxStartResult = {
  sandboxId: string | null;
  startedOk: boolean;
  immediateNote?: string;
};

const SANDBOX_TEMPLATE =
  process.env.E2B_SANDBOX_TEMPLATE || "code-interpreter-v1";

const SANDBOX_TTL_MS = readPositiveInt(
  process.env.E2B_SANDBOX_TTL_MS,
  45 * 60 * 1000,
);

const EXECUTION_TIMEOUT_SECONDS = Math.max(
  60,
  Math.floor(
    readPositiveInt(
      process.env.E2B_EXECUTION_TIMEOUT_MS,
      30 * 60 * 1000,
    ) / 1000,
  ),
);

const REQUEST_TIMEOUT_MS = readPositiveInt(
  process.env.E2B_REQUEST_TIMEOUT_MS,
  30 * 1000,
);

const MAX_OUTPUT_CHARS = readPositiveInt(
  process.env.E2B_MAX_OUTPUT_CHARS,
  120_000,
);

const EXECUTION_ROOT = "/home/user/lattice-execution";

function readPositiveInt(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function getInternetAccess(): boolean {
  return process.env.E2B_ALLOW_INTERNET_ACCESS === "true";
}

function limitOutput(value: unknown): string {
  const text = typeof value === "string" ? value : String(value ?? "");

  if (text.length <= MAX_OUTPUT_CHARS) {
    return text;
  }

  return (
    text.slice(0, MAX_OUTPUT_CHARS / 2) +
    "\n\n...[OUTPUT TRUNCATED BY EXECUTION LAYER]...\n\n" +
    text.slice(-MAX_OUTPUT_CHARS / 2)
  );
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function buildExecutionCommand(): string {
  return [
    "cd",
    shellQuote(EXECUTION_ROOT),
    "&&",
    "rm -f stdout.log stderr.log exit_code.txt finished.flag",
    "&&",
    `timeout --signal=TERM --kill-after=30s ${EXECUTION_TIMEOUT_SECONDS}s python3 -u run.py >stdout.log 2>stderr.log`,
    ";",
    "printf '%s' \"$?\" > exit_code.txt",
    ";",
    "touch finished.flag",
  ].join(" ");
}

async function connectSandbox(sandboxId: string) {
  return Sandbox.connect(sandboxId, {
    requestTimeoutMs: REQUEST_TIMEOUT_MS,
  });
}

async function safeKillSandbox(sandboxId: string): Promise<void> {
  try {
    const sandbox = await connectSandbox(sandboxId);
    await sandbox.kill({
      requestTimeoutMs: REQUEST_TIMEOUT_MS,
    });
  } catch {
  }
}

export async function startSandboxExecution(
  cleanCode: string,
): Promise<SandboxStartResult> {
  if (!process.env.E2B_API_KEY) {
    return {
      sandboxId: null,
      startedOk: false,
      immediateNote:
        "E2B_API_KEY is not configured on the server. Add it as a Vercel server environment variable.",
    };
  }

  if (!cleanCode.trim()) {
    return {
      sandboxId: null,
      startedOk: false,
      immediateNote: "The approved Python artifact is empty.",
    };
  }

  let sandbox: Awaited<ReturnType<typeof Sandbox.create>> | null = null;

  try {
    sandbox = await Sandbox.create(SANDBOX_TEMPLATE, {
      timeoutMs: SANDBOX_TTL_MS,
      requestTimeoutMs: REQUEST_TIMEOUT_MS,

      allowInternetAccess: getInternetAccess(),

      secure: true,

      metadata: {
        application: "lattice",
        purpose: "research-experiment",
      },
    });

    const sandboxId = sandbox.sandboxId;

    await sandbox.files.write(
      `${EXECUTION_ROOT}/run.py`,
      cleanCode,
    );

    const syntax = await sandbox.commands.run(
      `cd ${shellQuote(
        EXECUTION_ROOT,
      )} && python3 -m py_compile run.py`,
      {
        timeoutMs: 30_000,
      },
    );

    if (syntax.exitCode !== 0) {
      const syntaxError = limitOutput(
        [syntax.stdout, syntax.stderr]
          .filter(Boolean)
          .join("\n"),
      );

      await safeKillSandbox(sandboxId);

      return {
        sandboxId: null,
        startedOk: false,
        immediateNote:
          `Generated Python failed syntax validation before execution.\n${syntaxError}`,
      };
    }

    const command = buildExecutionCommand();

    await sandbox.commands.run(command, {
      background: true,
    });

    return {
      sandboxId,
      startedOk: true,
      immediateNote: getInternetAccess()
        ? "Sandbox started successfully with controlled internet access for real dataset retrieval."
        : "Sandbox started successfully with internet disabled.",
    };
  } catch (error) {
    if (sandbox) {
      try {
        await sandbox.kill({
          requestTimeoutMs: REQUEST_TIMEOUT_MS,
        });
      } catch {
      }
    }

    const message =
      error instanceof Error ? error.message : String(error);

    return {
      sandboxId: null,
      startedOk: false,
      immediateNote: `E2B sandbox start failed: ${message}`,
    };
  }
}

export async function pollSandboxExecution(
  sandboxId: string,
): Promise<SandboxExecutionResult> {
  let sandbox: Awaited<ReturnType<typeof Sandbox.connect>>;

  try {
    sandbox = await connectSandbox(sandboxId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    return {
      finished: true,
      success: false,
      stdout: "",
      stderr: "",
      error: `Could not reconnect to E2B sandbox: ${message}`,
    };
  }

  try {
    const running = await sandbox.isRunning({
      requestTimeoutMs: REQUEST_TIMEOUT_MS,
    });

    if (!running) {
      try {
        const finished = await sandbox.files.read(
          `${EXECUTION_ROOT}/finished.flag`,
        );

        if (!finished) {
          return {
            finished: true,
            success: false,
            stdout: "",
            stderr:
              "Sandbox stopped before the execution completion marker was written.",
            error:
              "Sandbox stopped before execution completed.",
          };
        }
      } catch {
        return {
          finished: true,
          success: false,
          stdout: "",
          stderr:
            "Sandbox is no longer running and execution state could not be recovered.",
          error:
            "Sandbox expired before the execution result could be collected.",
        };
      }
    }

    let finishedFlag = "";

    try {
      finishedFlag = await sandbox.files.read(
        `${EXECUTION_ROOT}/finished.flag`,
      );
    } catch {
      return {
        finished: false,
        success: false,
        stdout: "",
        stderr: "",
      };
    }

    if (!finishedFlag.trim()) {
      return {
        finished: false,
        success: false,
        stdout: "",
        stderr: "",
      };
    }

    let stdout = "";
    let stderr = "";
    let exitCode: number | null = null;

    try {
      stdout = await sandbox.files.read(
        `${EXECUTION_ROOT}/stdout.log`,
      );
    } catch {
      stdout = "";
    }

    try {
      stderr = await sandbox.files.read(
        `${EXECUTION_ROOT}/stderr.log`,
      );
    } catch {
      stderr = "";
    }

    try {
      const rawExitCode = await sandbox.files.read(
        `${EXECUTION_ROOT}/exit_code.txt`,
      );

      const parsed = Number(rawExitCode.trim());

      if (Number.isFinite(parsed)) {
        exitCode = parsed;
      }
    } catch {
      exitCode = null;
    }

    const finalStdout = limitOutput(stdout);
    const finalStderr = limitOutput(stderr);

    const success = exitCode === 0;

    await safeKillSandbox(sandboxId);

    return {
      finished: true,
      success,
      stdout: finalStdout,
      stderr: finalStderr,
      exitCode,
      error: success
        ? undefined
        : `Python process exited with code ${exitCode ?? "unknown"}.`,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    return {
      finished: false,
      success: false,
      stdout: "",
      stderr: "",
      error: `E2B polling error: ${message}`,
    };
  }
}
