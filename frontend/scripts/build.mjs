import { mkdir, cp } from "node:fs/promises";
import { resolve } from "node:path";

const publicDir = resolve("public");
const distDir = resolve("dist");

await mkdir(distDir, { recursive: true });
await cp(publicDir, distDir, { recursive: true });

console.log("✅ Build concluído: public -> dist");
