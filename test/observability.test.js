import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { promisify } from "node:util";
import test from "node:test";

const pages = ["index.html", "studio/index.html"];
const adsenseClient = "ca-pub-9870889480354395";
const adsenseHost = "https://pagead2.googlesyndication.com";
const run = promisify(execFile);

test("public pages load Vercel Web Analytics and Speed Insights", async () => {
  for (const page of pages) {
    const html = await readFile(new URL(`../${page}`, import.meta.url), "utf8");
    assert.match(html, /\/_vercel\/insights\/script\.js/);
    assert.match(html, /\/_vercel\/speed-insights\/script\.js/);
  }
});

test("public pages load AdSense from the document head", async () => {
  for (const page of pages) {
    const html = await readFile(new URL(`../${page}`, import.meta.url), "utf8");
    const head = html.match(/<head>([\s\S]*?)<\/head>/)?.[1] || "";

    assert.match(head, /pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/);
    assert.match(head, new RegExp(`client=${adsenseClient}`));
    assert.match(head, /crossorigin="anonymous"/);
  }
});

test("ads.txt declares the AdSense publisher account", async () => {
  const adsTxt = await readFile(new URL("../ads.txt", import.meta.url), "utf8");

  assert.match(adsTxt, /google\.com, pub-9870889480354395, DIRECT, f08c47fec0942fa0/);
});

test("content security policy allows analytics and AdSense", async () => {
  const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
  const policy = config.headers[0].headers.find((header) => header.key === "Content-Security-Policy")?.value;

  assert.match(policy, /script-src[^;]*'self'/);
  assert.match(policy, new RegExp(`script-src[^;]*${adsenseHost.replaceAll(".", "\\.")}`));
  assert.match(policy, /connect-src[^;]*'self'/);
  assert.match(policy, /connect-src[^;]*https:/);
  assert.match(policy, /img-src[^;]*https:/);
  assert.match(policy, /frame-src[^;]*https:/);
});

test("studio length control is a bounded numeric input", async () => {
  const html = await readFile(new URL("../studio/index.html", import.meta.url), "utf8");

  assert.match(html, /id="roundInput"[^>]*type="number"/);
  assert.match(html, /id="roundInput"[^>]*min="1"/);
  assert.match(html, /id="roundInput"[^>]*max="50"/);
  assert.match(html, /id="roundInput"[^>]*value="20"/);
});

test("studio removes tone controls from the form", async () => {
  const html = await readFile(new URL("../studio/index.html", import.meta.url), "utf8");

  assert.doesNotMatch(html, /name="tone"/);
  assert.doesNotMatch(html, /data-tone-label/);
  assert.doesNotMatch(html, /data-i18n="toneLabel"/);
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

test("static build includes ads.txt for AdSense verification", async () => {
  await run(process.execPath, [new URL("../scripts/build-static.js", import.meta.url).pathname], {
    cwd: new URL("..", import.meta.url).pathname
  });

  const adsTxt = await readFile(new URL("../public/ads.txt", import.meta.url), "utf8");

  assert.match(adsTxt, /google\.com, pub-9870889480354395, DIRECT, f08c47fec0942fa0/);
});
