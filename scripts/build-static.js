import { cp, mkdir, rm } from "node:fs/promises";

const outDir = new URL("../public/", import.meta.url);
const staticEntries = [
  "index.html",
  "app.js",
  "styles.css",
  "landing.css",
  "studio.css",
  "assets",
  "studio"
];

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

await Promise.all(staticEntries.map((entry) => {
  return cp(new URL(`../${entry}`, import.meta.url), new URL(entry, outDir), { recursive: true });
}));

console.log(`Copied ${staticEntries.length} static entries to public/`);
