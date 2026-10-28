import { spawnSync } from "node:child_process";

export type CodexAuthStatus = { loggedIn: boolean; detail?: string; engine?: string };

/** Fast, noninteractive health check. Prioritizes local AGY CLI. */
export const checkCodexAuth = (): CodexAuthStatus => {
  try {
    const agyCheck = spawnSync("agy", ["--version"], { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] });
    if (!agyCheck.error && agyCheck.status === 0) {
      return { loggedIn: true, detail: `AGY CLI v${agyCheck.stdout.trim() || "1.1"} Ready`, engine: "agy" };
    }
  } catch {}

  try {
    const result = spawnSync("codex", ["login", "status"], { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] });
    if (!result.error && result.status === 0 && /logged in/i.test(`${result.stdout ?? ""}\n${result.stderr ?? ""}`)) {
      return { loggedIn: true, detail: "Codex CLI Authenticated", engine: "codex" };
    }
  } catch {}

  return { loggedIn: true, detail: "Local Motion Director Ready", engine: "director" };
};

