import assert from "node:assert/strict";
import test from "node:test";
import { buildConversationInstructions, normalizeConversation, validateGeneratePayload } from "../lib/conversation.js";
import { mapConversationForPreview } from "../lib/studio-data.js";

const request = { topic: "A founder announces a beta launch", scene: "work", tone: "natural", language: "en", rounds: 4 };

test("validateGeneratePayload accepts the bounded studio request", () => {
  assert.deepEqual(validateGeneratePayload(request), { ok: true, value: request });
});

test("validateGeneratePayload rejects enum and size violations", () => {
  assert.equal(validateGeneratePayload({ ...request, language: "de" }).ok, false);
  assert.equal(validateGeneratePayload({ ...request, rounds: 9 }).ok, false);
  assert.equal(validateGeneratePayload({ ...request, extra: true }).ok, false);
});

test("normalizeConversation hydrates renderer-safe participants", () => {
  const result = normalizeConversation({
    title: "Beta launch",
    participants: [
      { id: "me", name: "Morgan", side: "me", handle: "morgan.ai" },
      { id: "ava", name: "Ava", side: "them", handle: "ava.builds" }
    ],
    messages: [
      { speakerId: "me", text: "The beta is ready for the first group." },
      { speakerId: "ava", text: "That is huge. What should we share first?" },
      { speakerId: "me", text: "A simple invitation and the product story." },
      { speakerId: "ava", text: "Perfect, I will make the launch post feel human." }
    ]
  }, request);
  assert.equal(result.participants[0].initials, "M");
  assert.equal(result.messages[3].id, "generated-4");
});

test("normalizeConversation rejects a wrong message count", () => {
  assert.throws(() => normalizeConversation({ title: "x", participants: [{ id: "me", name: "M", side: "me", handle: "m" }, { id: "a", name: "A", side: "them", handle: "a" }], messages: [] }, request));
});

test("instructions lock the selected language and count", () => {
  const text = buildConversationInstructions(request);
  assert.match(text, /English/);
  assert.match(text, /exactly 4 messages/);
});

test("client mapping keeps ordered speakers and renderer metadata", () => {
  const result = mapConversationForPreview({
    title: "Launch",
    participants: [{ id: "me", name: "Mina", side: "me" }, { id: "sam", name: "Sam", side: "them" }],
    messages: [{ speakerId: "me", text: "The waitlist is live." }, { speakerId: "sam", text: "I will share it now." }, { speakerId: "me", text: "Thank you for helping." }, { speakerId: "sam", text: "This is going to land well." }]
  }, request, {
    domain: { focus: "launch" },
    baseDate: new Date("2026-01-01T12:00:00Z"),
    rng: () => 0,
    formatTime: (_date, index) => `12:0${index}`
  });
  assert.equal(result.config.title, "Launch");
  assert.equal(result.messages[1].speaker.name, "Sam");
  assert.equal(result.messages[3].time, "12:03");
});
