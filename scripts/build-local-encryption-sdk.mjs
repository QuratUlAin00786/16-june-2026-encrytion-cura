import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tscPath = resolve(rootDir, "node_modules", "typescript", "bin", "tsc");
const sdkDir = resolve(rootDir, "encryption-sdk");

function runNode(args) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, args, {
      cwd: rootDir,
      stdio: "inherit",
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      rejectPromise(new Error(`Command failed with exit code ${code ?? "unknown"}`));
    });

    child.on("error", rejectPromise);
  });
}

async function main() {
  await runNode([
    tscPath,
    "-p",
    resolve(sdkDir, "tsconfig.json"),
    "--module",
    "commonjs",
    "--outDir",
    resolve(sdkDir, "dist", "cjs"),
  ]);

  await runNode([
    tscPath,
    "-p",
    resolve(sdkDir, "tsconfig.json"),
    "--module",
    "esnext",
    "--outDir",
    resolve(sdkDir, "dist", "esm"),
  ]);

  await mkdir(resolve(sdkDir, "dist", "esm"), { recursive: true });
  await writeFile(
    resolve(sdkDir, "dist", "esm", "package.json"),
    JSON.stringify({ type: "module" }, null, 2) + "\n",
    "utf8",
  );

  await runNode([
    tscPath,
    "-p",
    resolve(sdkDir, "tsconfig.json"),
    "--emitDeclarationOnly",
    "--outDir",
    resolve(sdkDir, "dist", "types"),
  ]);
}

main().catch((error) => {
  console.error("[build-local-encryption-sdk]", error);
  process.exit(1);
});
