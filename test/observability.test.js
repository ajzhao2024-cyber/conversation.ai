import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pages = ["index.html", "studio/index.html"];

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
