import {
  MAX_BODY_BYTES,
  buildConversationInput,
  buildConversationInstructions,
  normalizeConversation,
  validateGeneratePayload
} from "../lib/conversation.js";
import { createRateLimiter, hasUpstashCredentials } from "../lib/limiter.js";

const DEFAULT_DEEPSEEK_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-v4-flash";
const MIN_GENERATION_TOKENS = 1600;
const TOKENS_PER_MESSAGE = 120;

export const config = {
  api: { bodyParser: { sizeLimit: "2kb" } }
};

function json(res, status, body, headers = {}) {
  Object.entries(headers).forEach(([key, value]) => res.setHeader?.(key, value));
  return res.status(status).json(body);
}

function requestOrigin(req) {
  const origin = req.headers?.origin;
  if (!origin) return null;
  try { return new URL(origin); } catch { return undefined; }
}

export function isAllowedOrigin(req, env = process.env) {
  const origin = requestOrigin(req);
  if (origin === null) return true;
  if (!origin) return false;
  const configured = (env.ALLOWED_ORIGINS || "").split(",").map((item) => item.trim()).filter(Boolean);
  const forwardedHost = req.headers?.["x-forwarded-host"] || req.headers?.host;
  const protocol = req.headers?.["x-forwarded-proto"] || (forwardedHost?.startsWith("localhost") || forwardedHost?.startsWith("127.0.0.1") ? "http" : "https");
  if (forwardedHost) configured.push(`${protocol}://${forwardedHost}`);
  if (env.VERCEL_URL) configured.push(`https://${env.VERCEL_URL}`);
  return configured.includes(origin.origin);
}

function clientIp(req) {
  const forwarded = req.headers?.["x-forwarded-for"];
  return (typeof forwarded === "string" ? forwarded.split(",")[0] : "")?.trim() || req.socket?.remoteAddress || "unknown";
}

function bodySizeIsValid(req) {
  const header = Number(req.headers?.["content-length"] || 0);
  return !Number.isFinite(header) || header <= MAX_BODY_BYTES;
}

function parseBody(req) {
  if (typeof req.body === "string") return JSON.parse(req.body);
  return req.body;
}

function logGeneration(logger, req, env, payload) {
  logger.info?.({
    event: "generate_conversation",
    status: "ok",
    environment: env.VERCEL_ENV || "development",
    scene: payload.scene,
    language: payload.language,
    rounds: payload.rounds,
    vercelId: req.headers?.["x-vercel-id"] || null
  });
}

function extractDeepSeekContent(response) {
  const choice = Array.isArray(response?.choices) ? response.choices[0] : undefined;
  if (choice?.finish_reason === "content_filter") {
    const error = new Error("The model declined this request.");
    error.code = "refusal";
    throw error;
  }
  const content = choice?.message?.content;
  if (typeof content === "string" && content.trim()) return content;
  throw new Error("The model returned no structured text.");
}

export async function requestConversation(payload, { env = process.env, fetchImpl = fetch } = {}) {
  const apiKey = env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    const error = new Error("Conversation generation is not configured.");
    error.code = "configuration";
    throw error;
  }
  const baseUrl = (env.DEEPSEEK_BASE_URL || DEFAULT_DEEPSEEK_BASE_URL).replace(/\/+$/, "");
  const response = await fetchImpl(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: env.DEEPSEEK_MODEL || DEFAULT_MODEL,
      messages: [
        { role: "system", content: buildConversationInstructions(payload) },
        { role: "user", content: buildConversationInput(payload) }
      ],
      response_format: { type: "json_object" },
      thinking: { type: "disabled" },
      temperature: 0.7,
      max_tokens: Math.max(MIN_GENERATION_TOKENS, payload.rounds * TOKENS_PER_MESSAGE),
      stream: false
    })
  });
  if (!response.ok) {
    const error = new Error("The generation service could not complete the request.");
    error.code = "upstream";
    throw error;
  }
  const data = await response.json();
  const raw = extractDeepSeekContent(data);
  return normalizeConversation(JSON.parse(raw), payload);
}

export function createHandler({ env = process.env, fetchImpl = fetch, limiter = createRateLimiter({ env, fetchImpl }), logger = console } = {}) {
  return async function handler(req, res) {
    if (req.method === "OPTIONS") {
      if (!isAllowedOrigin(req, env)) return json(res, 403, { error: "Origin is not allowed.", code: "origin" });
      const origin = req.headers?.origin;
      return json(res, 204, null, origin ? { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "POST, OPTIONS", Vary: "Origin" } : {});
    }
    if (req.method !== "POST") return json(res, 405, { error: "Method not allowed.", code: "method" }, { Allow: "POST, OPTIONS" });
    if (!isAllowedOrigin(req, env)) return json(res, 403, { error: "Origin is not allowed.", code: "origin" });
    if (!bodySizeIsValid(req)) return json(res, 400, { error: "Request body is too large.", code: "body_size" });
    if (env.VERCEL_ENV === "production" && !hasUpstashCredentials(env)) {
      return json(res, 503, { error: "Rate limiting is not configured.", code: "limiter_configuration" });
    }

    let payload;
    try { payload = parseBody(req); } catch { return json(res, 400, { error: "Request body must be valid JSON.", code: "json" }); }
    const validated = validateGeneratePayload(payload);
    if (!validated.ok) return json(res, 400, { error: validated.error, code: "validation" });

    let limit;
    try { limit = await limiter.check(clientIp(req)); } catch { return json(res, 503, { error: "Rate limiting is temporarily unavailable.", code: "limiter" }); }
    if (!limit.success) {
      const retryAfter = Math.max(1, Math.ceil((limit.reset - Date.now()) / 1000));
      return json(res, 429, { error: "Too many generations. Please wait a minute and try again.", code: "rate_limit" }, { "Retry-After": String(retryAfter) });
    }

    try {
      const conversation = await requestConversation(validated.value, { env, fetchImpl });
      logGeneration(logger, req, env, validated.value);
      return json(res, 200, conversation, { "Cache-Control": "no-store" });
    } catch (error) {
      const status = error?.code === "configuration" ? 503 : 502;
      const message = error?.code === "configuration"
        ? "Generation is not configured on this deployment."
        : "We could not generate that conversation. Please try again.";
      return json(res, status, { error: message, code: error?.code || "upstream" });
    }
  };
}

export default createHandler();
