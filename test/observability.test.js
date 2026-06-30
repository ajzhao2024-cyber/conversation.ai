import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { promisify } from "node:util";
import test from "node:test";

const pages = ["index.html", "studio/index.html"];
const seoPages = [
  "instagram-dm-generator/index.html",
  "wechat-chat-generator/index.html",
  "chat-screenshot-generator/index.html",
  "ai-conversation-generator/index.html",
  "fake-instagram-dm-generator/index.html",
  "zh/wechat-chat-generator/index.html"
];
const allPublicPages = [...pages, ...seoPages];
const adsenseClient = "ca-pub-9870889480354395";
const adsenseHost = "https://pagead2.googlesyndication.com";
const run = promisify(execFile);
const generatorRoutes = [
  "/studio/",
  "/instagram-dm-generator/",
  "/fake-instagram-dm-generator/",
  "/wechat-chat-generator/",
  "/chat-screenshot-generator/",
  "/ai-conversation-generator/"
];

function extractJsonLd(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) => {
    return JSON.parse(match[1]);
  });
}

function schemaTypes(schemaDocuments) {
  return schemaDocuments.flatMap((schema) => {
    if (Array.isArray(schema["@graph"])) {
      return schema["@graph"].map((entry) => entry["@type"]);
    }

    return schema["@type"] ? [schema["@type"]] : [];
  });
}

test("public pages load Vercel Web Analytics and Speed Insights", async () => {
  for (const page of allPublicPages) {
    const html = await readFile(new URL(`../${page}`, import.meta.url), "utf8");
    assert.match(html, /\/_vercel\/insights\/script\.js/);
    assert.match(html, /\/_vercel\/speed-insights\/script\.js/);
  }
});

test("public pages load AdSense from the document head", async () => {
  for (const page of allPublicPages) {
    const html = await readFile(new URL(`../${page}`, import.meta.url), "utf8");
    const head = html.match(/<head>([\s\S]*?)<\/head>/)?.[1] || "";

    assert.match(head, /pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/);
    assert.match(head, new RegExp(`client=${adsenseClient}`));
    assert.match(head, /crossorigin="anonymous"/);
  }
});

test("public pages declare the browser tab icon", async () => {
  for (const page of allPublicPages) {
    const html = await readFile(new URL(`../${page}`, import.meta.url), "utf8");
    const head = html.match(/<head>([\s\S]*?)<\/head>/)?.[1] || "";

    assert.match(head, /<link rel="icon" href="\/favicon\.svg" type="image\/svg\+xml">/);
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
  assert.match(html, /id="roundInput"[^>]*value="8"/);
});

test("studio removes tone controls from the form", async () => {
  const html = await readFile(new URL("../studio/index.html", import.meta.url), "utf8");

  assert.doesNotMatch(html, /name="tone"/);
  assert.doesNotMatch(html, /data-tone-label/);
  assert.doesNotMatch(html, /data-i18n="toneLabel"/);
});

test("homepage is positioned as an AI chat screenshot generator", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

  assert.match(html, /<title>AI Chat Screenshot Generator/);
  assert.match(html, /<link rel="canonical" href="https:\/\/conversation\.autos\/">/);
  assert.match(html, /AI Chat Screenshot Generator/);
  assert.match(html, /Create a chat screenshot/);
  assert.match(html, /Try Instagram DM Generator/);
  assert.match(html, /For mockups, storytelling, education, and content creation/);
});

test("homepage exposes the Google Search Console verification tag", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const head = html.match(/<head>([\s\S]*?)<\/head>/)?.[1] || "";

  assert.match(head, /<meta name="google-site-verification" content="OuH0ImvKXQ04WpU1fBrt-nlfke321KoVlgM0glq_OmQ" \/>/);
});

test("studio exposes template chips and query-prefill copy", async () => {
  const html = await readFile(new URL("../studio/index.html", import.meta.url), "utf8");

  assert.match(html, /AI Chat Screenshot Generator/);
  assert.match(html, /data-template-topic="Make a funny Instagram DM"/);
  assert.match(html, /data-template-topic="Create a customer support conversation"/);
  assert.match(html, /data-template-topic="Generate a WeChat sales chat"/);
  assert.match(html, /For mockups, storytelling, education, and content creation/);
});

test("SEO pages include canonical metadata, FAQ, demo links, and safety copy", async () => {
  for (const page of seoPages) {
    const html = await readFile(new URL(`../${page}`, import.meta.url), "utf8");
    const route = page.replace(/index\.html$/, "");

    assert.match(html, new RegExp(`<link rel="canonical" href="https://conversation\\.autos/${route}">`));
    assert.match(html, /property="og:title"/);
    assert.match(html, /name="twitter:card" content="summary_large_image"/);
    assert.match(html, /\/studio\/\?topic=/);
    assert.match(html, /How to use/);
    assert.match(html, /Use cases/);
    assert.match(html, /FAQ/);
    assert.match(html, /For mockups, storytelling, education, and content creation/);
  }
});

test("public pages expose valid structured data for search engines", async () => {
  for (const page of allPublicPages) {
    const html = await readFile(new URL(`../${page}`, import.meta.url), "utf8");
    const schemas = extractJsonLd(html);
    const types = schemaTypes(schemas);

    assert.ok(schemas.length > 0, `${page} should include JSON-LD`);
    assert.ok(types.includes("SoftwareApplication"), `${page} should describe the web tool`);

    if (seoPages.includes(page)) {
      assert.ok(types.includes("FAQPage"), `${page} should expose visible FAQ content`);
      assert.ok(types.includes("BreadcrumbList"), `${page} should expose breadcrumbs`);
    }

    if (page === "index.html") {
      assert.ok(types.includes("WebSite"), "homepage should describe the site");
      assert.ok(types.includes("Organization"), "homepage should describe the organization");
    }

    if (page === "studio/index.html") {
      assert.ok(types.includes("BreadcrumbList"), "studio should expose breadcrumbs");
    }
  }
});

test("landing pages expose internal links to generator hubs", async () => {
  for (const page of ["index.html", ...seoPages]) {
    const html = await readFile(new URL(`../${page}`, import.meta.url), "utf8");

    assert.match(html, /aria-label="Generator links"/);
    for (const route of generatorRoutes) {
      assert.match(html, new RegExp(`href="${route.replaceAll("/", "\\/")}"`), `${page} should link to ${route}`);
    }
  }
});

test("WeChat language pages declare reciprocal hreflang", async () => {
  for (const page of ["wechat-chat-generator/index.html", "zh/wechat-chat-generator/index.html"]) {
    const html = await readFile(new URL(`../${page}`, import.meta.url), "utf8");

    assert.match(html, /rel="alternate" hreflang="en" href="https:\/\/conversation\.autos\/wechat-chat-generator\/"/);
    assert.match(html, /rel="alternate" hreflang="zh-CN" href="https:\/\/conversation\.autos\/zh\/wechat-chat-generator\/"/);
    assert.match(html, /rel="alternate" hreflang="x-default" href="https:\/\/conversation\.autos\/wechat-chat-generator\/"/);
  }
});

test("crawl assets expose conversation.autos public routes", async () => {
  const robots = await readFile(new URL("../robots.txt", import.meta.url), "utf8");
  const sitemap = await readFile(new URL("../sitemap.xml", import.meta.url), "utf8");

  assert.match(robots, /Sitemap: https:\/\/conversation\.autos\/sitemap\.xml/);
  for (const route of ["/", "/studio/", "/instagram-dm-generator/", "/wechat-chat-generator/", "/chat-screenshot-generator/", "/ai-conversation-generator/", "/fake-instagram-dm-generator/", "/zh/wechat-chat-generator/"]) {
    assert.match(sitemap, new RegExp(`<loc>https://conversation\\.autos${route}</loc>`));
  }
  assert.match(sitemap, /<lastmod>2026-06-30<\/lastmod>/);
  assert.match(sitemap, /<changefreq>weekly<\/changefreq>/);
  assert.match(sitemap, /hreflang="zh-CN" href="https:\/\/conversation\.autos\/zh\/wechat-chat-generator\/"/);
  assert.match(sitemap, /hreflang="x-default" href="https:\/\/conversation\.autos\/wechat-chat-generator\/"/);
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

test("static build includes SEO pages and crawl assets", async () => {
  await run(process.execPath, [new URL("../scripts/build-static.js", import.meta.url).pathname], {
    cwd: new URL("..", import.meta.url).pathname
  });

  await access(new URL("../public/favicon.svg", import.meta.url));
  await access(new URL("../public/robots.txt", import.meta.url));
  await access(new URL("../public/sitemap.xml", import.meta.url));
  for (const page of seoPages) {
    await access(new URL(`../public/${page}`, import.meta.url));
  }
});
