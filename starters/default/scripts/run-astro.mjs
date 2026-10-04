import { spawn } from "node:child_process";
import { applyCachePatch, resolveAstroEntrypoint } from "./http-cache-security.mjs";

try {
  await applyCachePatch();
  const child = spawn(process.execPath, [resolveAstroEntrypoint(), ...process.argv.slice(2)], { stdio: "inherit" });
  child.on("error", (error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
  child.on("exit", (code) => { process.exitCode = code ?? 1; });
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
