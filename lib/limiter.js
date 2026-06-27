const WINDOW_MS = 60_000;

export class MemoryRateLimiter {
  constructor({ limit = 6, windowMs = WINDOW_MS, now = () => Date.now() } = {}) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.now = now;
    this.hits = new Map();
  }

  async check(identifier) {
    const now = this.now();
    const current = (this.hits.get(identifier) || []).filter((timestamp) => timestamp > now - this.windowMs);
    const success = current.length < this.limit;
    if (success) current.push(now);
    this.hits.set(identifier, current);
    const reset = (current[0] || now) + this.windowMs;
    return { success, remaining: Math.max(0, this.limit - current.length), reset };
  }
}

export class UpstashRateLimiter {
  constructor({ url, token, limit = 6, windowSeconds = 60, fetchImpl = fetch } = {}) {
    this.url = url.replace(/\/$/, "");
    this.token = token;
    this.limit = limit;
    this.windowSeconds = windowSeconds;
    this.fetchImpl = fetchImpl;
  }

  async check(identifier) {
    const key = `conversation-ai:generate:${identifier}`;
    const response = await this.fetchImpl(`${this.url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify([["INCR", key], ["EXPIRE", key, this.windowSeconds]])
    });
    if (!response.ok) throw new Error("Rate limiter unavailable.");
    const result = await response.json();
    const count = Number(result?.[0]?.result);
    if (!Number.isFinite(count)) throw new Error("Rate limiter response was invalid.");
    return { success: count <= this.limit, remaining: Math.max(0, this.limit - count), reset: Date.now() + this.windowSeconds * 1000 };
  }
}

export function hasUpstashCredentials(env = process.env) {
  return Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
}

export function createRateLimiter({ env = process.env, fetchImpl = fetch, now } = {}) {
  if (hasUpstashCredentials(env)) {
    return new UpstashRateLimiter({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN, fetchImpl });
  }
  return new MemoryRateLimiter({ now });
}
