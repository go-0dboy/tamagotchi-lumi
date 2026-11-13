import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const publicFiles = [
  "manifest.webmanifest", "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png",
];

function offlineShell() {
  return {
    name: "lumos-offline-shell",
    apply: "build",
    async generateBundle(_options, bundle) {
      const worker = await readFile(new URL("./service-worker.js", import.meta.url), "utf8");
      const revision = createHash("sha256").update(worker);
      for (const [file, output] of Object.entries(bundle).sort(([a], [b]) => a.localeCompare(b))) {
        revision.update(file).update(output.type === "asset" ? output.source : output.code);
      }
      for (const file of publicFiles) {
        revision.update(await readFile(new URL(`./public/${file}`, import.meta.url)));
      }
      const assets = [...new Set([...Object.keys(bundle), ...publicFiles])].filter(file => file !== "index.html");
      this.emitFile({
        type: "asset",
        fileName: "sw.js",
        source: worker
          .replace("__LUMOS_REVISION__", revision.digest("hex").slice(0, 16))
          .replace("/* __LUMOS_ASSETS__ */ []", JSON.stringify(assets)),
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), offlineShell()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    hmr: {
      port: 3000,
    },
  },
});
