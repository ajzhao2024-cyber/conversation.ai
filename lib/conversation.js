export const LANGUAGE_NAMES = {
  en: "English",
  es: "Spanish",
  fr: "French",
  pt: "Portuguese",
  ja: "Japanese",
  zh: "Simplified Chinese"
};

export const SCENES = ["daily", "work", "support"];
export const MIN_ROUNDS = 1;
export const MAX_ROUNDS = 50;
export const MAX_TOPIC_LENGTH = 280;
export const MAX_BODY_BYTES = 2048;

const PARTICIPANT_COLORS = ["#4f5bd5", "#d62976", "#0f9f6e", "#fa7e1e"];

export const CONVERSATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "participants", "messages"],
  properties: {
    title: { type: "string", minLength: 1, maxLength: 48 },
    participants: {
      type: "array",
      minItems: 2,
      maxItems: 2,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "name", "side", "handle"],
        properties: {
          id: { type: "string", pattern: "^[a-z][a-z0-9_-]{0,15}$" },
          name: { type: "string", minLength: 1, maxLength: 32 },
          side: { type: "string", enum: ["me", "them"] },
          handle: { type: "string", minLength: 1, maxLength: 32 }
        }
      }
    },
    messages: {
      type: "array",
      minItems: MIN_ROUNDS,
      maxItems: MAX_ROUNDS,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["speakerId", "text"],
        properties: {
          speakerId: { type: "string", pattern: "^[a-z][a-z0-9_-]{0,15}$" },
          text: { type: "string", minLength: 1, maxLength: 280 }
        }
      }
    }
  }
};

function hasOnlyKeys(value, keys) {
  return Object.keys(value).every((key) => keys.includes(key));
}

export function validateGeneratePayload(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Request body must be a JSON object." };
  }
  if (!hasOnlyKeys(input, ["topic", "scene", "language", "rounds"])) {
    return { ok: false, error: "Request contains unsupported fields." };
  }

  const topic = typeof input.topic === "string" ? input.topic.replace(/\s+/g, " ").trim() : "";
  if (!topic || topic.length > MAX_TOPIC_LENGTH) {
    return { ok: false, error: `Topic must be between 1 and ${MAX_TOPIC_LENGTH} characters.` };
  }
  if (!SCENES.includes(input.scene)) return { ok: false, error: "Scene is invalid." };
  if (!Object.hasOwn(LANGUAGE_NAMES, input.language)) return { ok: false, error: "Language is invalid." };
  if (!Number.isInteger(input.rounds) || input.rounds < MIN_ROUNDS || input.rounds > MAX_ROUNDS) {
    return { ok: false, error: `Rounds must be an integer between ${MIN_ROUNDS} and ${MAX_ROUNDS}.` };
  }

  return { ok: true, value: { topic, scene: input.scene, language: input.language, rounds: input.rounds } };
}

export function initials(name) {
  const normalized = String(name || "").trim();
  if (!normalized) return "C";
  return Array.from(normalized)[0].toLocaleUpperCase();
}

export function normalizeConversation(value, request) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Model response was not an object.");
  const { title, participants, messages } = value;
  if (typeof title !== "string" || !title.trim() || title.length > 48) throw new Error("Model response has an invalid title.");
  if (!Array.isArray(participants) || participants.length !== 2) throw new Error("Model response has invalid participants.");
  if (!Array.isArray(messages) || messages.length !== request.rounds) throw new Error("Model response has an invalid number of messages.");

  const ids = new Set();
  const normalizedParticipants = participants.map((participant, index) => {
    if (!participant || typeof participant !== "object") throw new Error("Model response has an invalid participant.");
    const { id, name, side, handle } = participant;
    if (!/^[a-z][a-z0-9_-]{0,15}$/.test(id || "") || ids.has(id)) throw new Error("Model response has duplicate participant ids.");
    if (typeof name !== "string" || !name.trim() || name.length > 32) throw new Error("Model response has an invalid participant name.");
    if (!["me", "them"].includes(side)) throw new Error("Model response has an invalid participant side.");
    if (typeof handle !== "string" || !handle.trim() || handle.length > 32) throw new Error("Model response has an invalid participant handle.");
    ids.add(id);
    return { id, name: name.trim(), side, handle: handle.trim(), initials: initials(name), color: side === "me" ? "#d62976" : PARTICIPANT_COLORS[index % PARTICIPANT_COLORS.length] };
  });

  if (normalizedParticipants.filter((participant) => participant.side === "me").length !== 1) {
    throw new Error("Model response must contain exactly one local participant.");
  }

  return {
    title: title.trim(),
    participants: normalizedParticipants,
    messages: messages.map((message, index) => {
      if (!message || typeof message !== "object" || !ids.has(message.speakerId)) throw new Error("Model response references an unknown speaker.");
      if (typeof message.text !== "string" || !message.text.trim() || message.text.length > 280) throw new Error("Model response has invalid message text.");
      return { id: `generated-${index + 1}`, speakerId: message.speakerId, text: message.text.trim() };
    })
  };
}

export function buildConversationInstructions(request) {
  const sceneDescription = {
    daily: "a realistic 1:1 social chat screenshot",
    work: "a creator or marketing collaboration DM screenshot",
    support: "a customer support or sales chat screenshot"
  }[request.scene] || request.scene;

  return [
    "You write short, natural chat conversations for an AI chat screenshot generator.",
    `Write every message in ${LANGUAGE_NAMES[request.language]}.`,
    `The scene is ${sceneDescription}.`,
    `Create exactly ${request.rounds} messages. Keep each message under 180 characters.`,
    "Use exactly 2 participants. Include exactly one participant with side 'me'. The other participant must use side 'them'.",
    "Make the exchange specific to the topic without copying the user prompt verbatim as every message.",
    "Do not use markdown, stage directions, emojis, or labels in message text.",
    "Return only valid JSON.",
    "The JSON object must include title, participants, and messages.",
    "Each participant must include id, name, side, and handle.",
    "Each message must include speakerId and text."
  ].join(" ");
}

export function buildConversationInput(request) {
  return `Topic: ${request.topic}\nScene: ${request.scene}\nLanguage: ${LANGUAGE_NAMES[request.language]}\nMessages required: ${request.rounds}`;
}
