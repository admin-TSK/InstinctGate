import { ensureVault, resolveVault } from "../lib/vault.js";

export function cmdInit(opts: { vault?: string }): void {
  const vault = resolveVault(process.cwd(), opts.vault);
  ensureVault(vault);
  console.log(`InstinctGate vault ready: ${vault}`);
}
