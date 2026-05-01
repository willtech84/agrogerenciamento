import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

function run(cmd, args) {
  return new Promise((ok, fail) => {
    const p = spawn(cmd, args, { stdio: "inherit", shell: true });
    p.on("exit", (code) => (code === 0 ? ok() : fail(new Error(`${cmd} ${args.join(" ")} falhou: ${code}`))));
  });
}

const androidDir = resolve("android");

try {
  await access(androidDir, constants.F_OK);
} catch {
  await run("npx", ["cap", "add", "android"]);
}

await run("npx", ["cap", "sync", "android"]);
console.log("✅ Android preparado.");
