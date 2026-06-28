import assert from "node:assert/strict";
import test from "node:test";
import { buildConversationInstructions, normalizeConversation, validateGeneratePayload } from "../lib/conversation.js";
import { mapConversationForPreview, updatePreviewMessage, updatePreviewMessagesFromScript } from "../lib/studio-data.js";

const request = { topic: "A founder announces a beta launch", scene: "daily", language: "en", rounds: 4 };

test("validateGeneratePayload accepts the bounded studio request", () => {
  assert.deepEqual(validateGeneratePayload(request), { ok: true, value: request });
});

test("validateGeneratePayload rejects enum and size violations", () => {
  assert.equal(validateGeneratePayload({ ...request, language: "de" }).ok, false);
  assert.equal(validateGeneratePayload({ ...request, scene: "work" }).ok, false);
  assert.equal(validateGeneratePayload({ ...request, rounds: 51 }).ok, false);
  assert.equal(validateGeneratePayload({ ...request, rounds: 0 }).ok, false);
  assert.equal(validateGeneratePayload({ ...request, tone: "casual" }).ok, false);
  assert.equal(validateGeneratePayload({ ...request, extra: true }).ok, false);
});

test("validateGeneratePayload accepts long user-entered conversation length", () => {
  const result = validateGeneratePayload({ ...request, rounds: 50 });
  assert.deepEqual(result, { ok: true, value: { ...request, rounds: 50 } });
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

test("normalizeConversation rejects non-1:1 participant counts", () => {
  assert.throws(() => normalizeConversation({
    title: "x",
    participants: [
      { id: "me", name: "M", side: "me", handle: "m" },
      { id: "a", name: "A", side: "them", handle: "a" },
      { id: "b", name: "B", side: "them", handle: "b" }
    ],
    messages: [
      { speakerId: "me", text: "One" },
      { speakerId: "a", text: "Two" },
      { speakerId: "me", text: "Three" },
      { speakerId: "a", text: "Four" }
    ]
  }, request));
});

test("instructions lock the selected language and count", () => {
  const text = buildConversationInstructions(request);
  assert.match(text, /English/);
  assert.match(text, /exactly 4 messages/);
  assert.match(text, /exactly 2 participants/);
  assert.doesNotMatch(text, /tone is/i);
});

test("instructions define participant side enum values", () => {
  const text = buildConversationInstructions(request);
  assert.match(text, /side 'me'/);
  assert.match(text, /side 'them'/);
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

test("script edits update one preview message without changing renderer metadata", () => {
  const messages = [
    { id: "m1", speaker: { id: "me", name: "Me", side: "me" }, text: "Original", time: "12:00" },
    { id: "m2", speaker: { id: "sam", name: "Sam", side: "them" }, text: "Before", time: "12:01" }
  ];

  const result = updatePreviewMessage(messages, 1, "  Updated reply  ");

  assert.equal(result[1].text, "Updated reply");
  assert.equal(result[1].id, "m2");
  assert.equal(result[1].speaker, messages[1].speaker);
  assert.equal(result[1].time, "12:01");
  assert.equal(messages[1].text, "Before");
});

test("script edits reject blank message text", () => {
  assert.throws(() => updatePreviewMessage([{ id: "m1", speaker: { id: "me" }, text: "Original", time: "12:00" }], 0, "   "));
});

test("combined script edits update messages line by line", () => {
  const messages = [
    { id: "m1", speaker: { id: "me", name: "Me", side: "me" }, text: "Original", time: "12:00" },
    { id: "m2", speaker: { id: "kai", name: "Kai", side: "them" }, text: "Before", time: "12:01" }
  ];

  const result = updatePreviewMessagesFromScript(messages, "Me: New opener\nKai: New reply");

  assert.equal(result[0].text, "New opener");
  assert.equal(result[1].text, "New reply");
  assert.equal(result[0].speaker, messages[0].speaker);
  assert.equal(result[1].time, "12:01");
});

test("combined script edits reject the wrong number of message lines", () => {
  assert.throws(() => updatePreviewMessagesFromScript([{ id: "m1", speaker: { id: "me" }, text: "Original", time: "12:00" }], "Me: One\nKai: Two"));
});
