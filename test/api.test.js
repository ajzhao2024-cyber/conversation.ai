import assert from "node:assert/strict";
import test from "node:test";
import { createHandler, requestConversation } from "../api/generate.js";

const payload = { topic: "A creator plans a launch post", scene: "work", tone: "casual", language: "en", rounds: 3 };

function mockRes() {
  return { headers: {}, code: 0, body: undefined, setHeader(key, value) { this.headers[key] = value; }, status(code) { this.code = code; return this; }, json(value) { this.body = value; return this; } };
}

test("handler returns 400 for invalid payloads", async () => {
  const handler = createHandler({ env: {}, limiter: { check: async () => ({ success: true }) } });
  const res = mockRes();
  await handler({ method: "POST", headers: { host: "localhost" }, body: { ...payload, rounds: 10 } }, res);
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

test("requestConversation maps an OpenAI structured response", async () => {
  let requestBody;
  const fetchImpl = async (_url, init) => {
    requestBody = JSON.parse(init.body);
    return { ok: true, json: async () => ({ output_text: JSON.stringify({ title: "Launch", participants: [{ id: "me", name: "Mina", side: "me", handle: "mina" }, { id: "sam", name: "Sam", side: "them", handle: "sam" }], messages: [{ speakerId: "me", text: "We are ready." }, { speakerId: "sam", text: "Let us share it." }, { speakerId: "me", text: "I will post it today." }] }) }) };
  };
  const result = await requestConversation(payload, { env: { OPENAI_API_KEY: "test" }, fetchImpl });
  assert.equal(result.messages.length, 3);
  assert.equal(result.participants[1].name, "Sam");
  assert.equal(requestBody.model, "gpt-5.4-mini");
  assert.equal(requestBody.text.format.type, "json_schema");
  assert.equal(requestBody.text.format.strict, true);
});

test("requestConversation treats a model refusal as an upstream failure", async () => {
  const fetchImpl = async () => ({ ok: true, json: async () => ({ output: [{ content: [{ type: "refusal", refusal: "No" }] }] }) });
  await assert.rejects(() => requestConversation(payload, { env: { OPENAI_API_KEY: "test" }, fetchImpl }), { message: /declined/ });
});

test("handler maps a failed OpenAI request to 502", async () => {
  const fetchImpl = async () => ({ ok: false, json: async () => ({}) });
  const handler = createHandler({ env: { OPENAI_API_KEY: "test" }, fetchImpl, limiter: { check: async () => ({ success: true }) } });
  const res = mockRes();
  await handler({ method: "POST", headers: { host: "localhost" }, body: payload }, res);
  assert.equal(res.code, 502);
  assert.equal(res.body.code, "upstream");
});

test("production handler fails closed when Upstash is missing", async () => {
  const handler = createHandler({ env: { VERCEL_ENV: "production", OPENAI_API_KEY: "test" }, limiter: { check: async () => ({ success: true }) } });
  const res = mockRes();
  await handler({ method: "POST", headers: { host: "localhost" }, body: payload }, res);
  assert.equal(res.code, 503);
  assert.equal(res.body.code, "limiter_configuration");
});
