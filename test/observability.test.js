import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { promisify } from "node:util";
import test from "node:test";

const pages = ["index.html", "studio/index.html"];
const run = promisify(execFile);

test("public pages load Vercel Web Analytics and Speed Insights", async () => {
  for (const page of pages) {
    const html = await readFile(new URL(`../${page}`, import.meta.url), "utf8");
    assert.match(html, /\/_vercel\/insights\/script\.js/);
    assert.match(html, /\/_vercel\/speed-insights\/script\.js/);
  }
});

test("content security policy allows Vercel analytics endpoints", async () => {
  const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
  const policy = config.headers[0].headers.find((header) => header.key === "Content-Security-Policy")?.value;

  assert.match(policy, /script-src[^;]*'self'/);
  assert.match(policy, /connect-src[^;]*'self'/);
});

test("static build includes modules imported by the studio client", async () => {
  await run(process.execPath, [new URL("../scripts/build-static.js", import.meta.url).pathname], {
    cwd: new URL("..", import.meta.url).pathname
  });

  const appUrl = new URL("../public/app.js", import.meta.url);
  const appSource = await readFile(appUrl, "utf8");
  const imports = [...appSource.matchAll(/import\s+.+?\s+from\s+["'](.+?)["'];/g)]
    .map((match) => match[1])
    .filter((source) => source.startsWith("."));

  for (const source of imports) {
    await access(new URL(source, appUrl));
  }
});
