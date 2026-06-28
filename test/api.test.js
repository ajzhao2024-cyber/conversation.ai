import assert from "node:assert/strict";
import test from "node:test";
import { createHandler, requestConversation } from "../api/generate.js";

const payload = { topic: "A creator plans a launch post with a casual tone", scene: "daily", language: "en", rounds: 3 };

function mockRes() {
  return { headers: {}, code: 0, body: undefined, setHeader(key, value) { this.headers[key] = value; }, status(code) { this.code = code; return this; }, json(value) { this.body = value; return this; } };
}

test("handler returns 400 for invalid payloads", async () => {
  const handler = createHandler({ env: {}, limiter: { check: async () => ({ success: true }) } });
  const res = mockRes();
  await handler({ method: "POST", headers: { host: "localhost" }, body: { ...payload, rounds: 51 } }, res);
  assert.equal(res.code, 400);
  assert.equal(res.body.code, "validation");
});

test("handler returns 429 with a retry header", async () => {
  const handler = createHandler({ env: {}, limiter: { check: async () => ({ success: false, reset: Date.now() + 1000 }) } });
  const res = mockRes();
  await handler({ method: "POST", headers: { host: "localhost" }, body: payload }, res);
  assert.equal(res.code, 429);
  assert.ok(res.headers["Retry-After"]);
});

test("requestConversation maps a DeepSeek chat completion response", async () => {
  let requestUrl;
  let requestBody;
  let requestHeaders;
  const fetchImpl = async (url, init) => {
    requestUrl = url;
    requestHeaders = init.headers;
    requestBody = JSON.parse(init.body);
    return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ title: "Launch", participants: [{ id: "me", name: "Mina", side: "me", handle: "mina" }, { id: "sam", name: "Sam", side: "them", handle: "sam" }], messages: [{ speakerId: "me", text: "We are ready." }, { speakerId: "sam", text: "Let us share it." }, { speakerId: "me", text: "I will post it today." }] }) }, finish_reason: "stop" }] }) };
  };
  const result = await requestConversation(payload, { env: { DEEPSEEK_API_KEY: "test" }, fetchImpl });
  assert.equal(result.messages.length, 3);
  assert.equal(result.participants[1].name, "Sam");
  assert.equal(requestUrl, "https://api.deepseek.com/chat/completions");
  assert.equal(requestHeaders.Authorization, "Bearer test");
  assert.equal(requestBody.model, "deepseek-v4-flash");
  assert.deepEqual(requestBody.response_format, { type: "json_object" });
  assert.equal(requestBody.stream, false);
  assert.equal(requestBody.thinking.type, "disabled");
  assert.deepEqual(requestBody.messages.map((message) => message.role), ["system", "user"]);
  assert.match(requestBody.messages[0].content, /JSON/i);
  assert.doesNotMatch(requestBody.messages[0].content, /tone is/i);
  assert.doesNotMatch(requestBody.messages[1].content, /^Tone:/m);
});

test("requestConversation treats empty DeepSeek content as an upstream failure", async () => {
  const fetchImpl = async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: "" }, finish_reason: "stop" }] }) });
  await assert.rejects(() => requestConversation(payload, { env: { DEEPSEEK_API_KEY: "test" }, fetchImpl }), { message: /no structured text/ });
});

test("requestConversation scales token budget for long conversations", async () => {
  let requestBody;
  const longPayload = { ...payload, rounds: 50 };
  const messages = Array.from({ length: 50 }, (_, index) => ({
    speakerId: index % 2 === 0 ? "me" : "sam",
    text: `Message ${index + 1}`
  }));
  const fetchImpl = async (_url, init) => {
    requestBody = JSON.parse(init.body);
    return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ title: "Long chat", participants: [{ id: "me", name: "Mina", side: "me", handle: "mina" }, { id: "sam", name: "Sam", side: "them", handle: "sam" }], messages }) }, finish_reason: "stop" }] }) };
  };

  const result = await requestConversation(longPayload, { env: { DEEPSEEK_API_KEY: "test" }, fetchImpl });

  assert.equal(result.messages.length, 50);
  assert.ok(requestBody.max_tokens >= 5000);
});

test("handler maps a failed DeepSeek request to 502", async () => {
  const fetchImpl = async () => ({ ok: false, json: async () => ({}) });
  const handler = createHandler({ env: { DEEPSEEK_API_KEY: "test" }, fetchImpl, limiter: { check: async () => ({ success: true }) } });
  const res = mockRes();
  await handler({ method: "POST", headers: { host: "localhost" }, body: payload }, res);
  assert.equal(res.code, 502);
  assert.equal(res.body.code, "upstream");
});

test("handler maps missing DeepSeek configuration to 503", async () => {
  const handler = createHandler({ env: {}, limiter: { check: async () => ({ success: true }) } });
  const res = mockRes();
  await handler({ method: "POST", headers: { host: "localhost" }, body: payload }, res);
  assert.equal(res.code, 503);
  assert.equal(res.body.code, "configuration");
});

test("handler writes structured generation logs", async () => {
  const entries = [];
  const fetchImpl = async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ title: "Launch", participants: [{ id: "me", name: "Mina", side: "me", handle: "mina" }, { id: "sam", name: "Sam", side: "them", handle: "sam" }], messages: [{ speakerId: "me", text: "We are ready." }, { speakerId: "sam", text: "Let us share it." }, { speakerId: "me", text: "I will post it today." }] }) }, finish_reason: "stop" }] }) });
  const handler = createHandler({
    env: { DEEPSEEK_API_KEY: "test", VERCEL_ENV: "preview" },
    fetchImpl,
    limiter: { check: async () => ({ success: true }) },
    logger: { info: (entry) => entries.push(entry), warn: (entry) => entries.push(entry), error: (entry) => entries.push(entry) }
  });
  const res = mockRes();

  await handler({ method: "POST", headers: { host: "conversation.ai", "x-vercel-id": "iad1::abc" }, body: payload }, res);

  assert.equal(res.code, 200);
  assert.equal(entries.length, 1);
  assert.deepEqual(entries[0], {
    event: "generate_conversation",
    status: "ok",
    environment: "preview",
    scene: "daily",
    language: "en",
    rounds: 3,
    vercelId: "iad1::abc"
  });
});

test("production handler fails closed when Upstash is missing", async () => {
  const handler = createHandler({ env: { VERCEL_ENV: "production", DEEPSEEK_API_KEY: "test" }, limiter: { check: async () => ({ success: true }) } });
  const res = mockRes();
  await handler({ method: "POST", headers: { host: "localhost" }, body: payload }, res);
  assert.equal(res.code, 503);
  assert.equal(res.body.code, "limiter_configuration");
});
