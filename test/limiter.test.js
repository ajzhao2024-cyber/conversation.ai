import assert from "node:assert/strict";
import test from "node:test";
import { MemoryRateLimiter, UpstashRateLimiter, createRateLimiter } from "../lib/limiter.js";

test("memory limiter rejects a request after its per-minute limit", async () => {
  let now = 1000;
  const limiter = new MemoryRateLimiter({ limit: 2, now: () => now });
  assert.equal((await limiter.check("127.0.0.1")).success, true);
  assert.equal((await limiter.check("127.0.0.1")).success, true);
  assert.equal((await limiter.check("127.0.0.1")).success, false);
  now += 61_000;
  assert.equal((await limiter.check("127.0.0.1")).success, true);
});

test("limiter uses a local adapter when Upstash is not configured", () => {
  assert.ok(createRateLimiter({ env: {} }) instanceof MemoryRateLimiter);
});

test("Upstash adapter sends an atomic counter pipeline", async () => {
  let request;
  const limiter = new UpstashRateLimiter({
    url: "https://example.upstash.io",
    token: "token",
    fetchImpl: async (_url, init) => {
      request = init;
      return { ok: true, json: async () => [{ result: 2 }, { result: 1 }] };
    }
  });
  const result = await limiter.check("203.0.113.1");
  assert.equal(result.success, true);
  assert.match(request.body, /INCR/);
  assert.match(request.body, /EXPIRE/);
});
