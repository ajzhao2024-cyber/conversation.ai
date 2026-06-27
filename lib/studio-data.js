export function mapConversationForPreview(response, payload, { domain, formatTime, baseDate, rng } = {}) {
  if (!response || typeof response !== "object" || !Array.isArray(response.participants) || !Array.isArray(response.messages)) {
    throw new Error("The conversation response was invalid.");
  }
  const participantsById = new Map(response.participants.map((participant) => [participant.id, participant]));
  const messages = response.messages.map((message, index) => ({
    id: message.id || `generated-${index + 1}`,
    speaker: participantsById.get(message.speakerId),
    text: message.text,
    time: formatTime(baseDate, index, rng)
  }));

  if (messages.length !== payload.rounds || messages.some((message) => !message.speaker || typeof message.text !== "string" || !message.text.trim())) {
    throw new Error("The conversation response was incomplete.");
  }

  return {
    config: { ...payload, title: response.title, participants: response.participants, domain },
    messages
  };
}

export function updatePreviewMessage(messages, index, text) {
  if (!Array.isArray(messages) || !Number.isInteger(index) || index < 0 || index >= messages.length) {
    throw new Error("The message edit target was invalid.");
  }
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    throw new Error("Message text cannot be blank.");
  }

  return messages.map((message, messageIndex) => (
    messageIndex === index ? { ...message, text: normalized } : message
  ));
}

export function formatPreviewScript(messages, displayName = (speaker) => speaker?.name || "Speaker") {
  if (!Array.isArray(messages)) return "";
  return messages.map((message) => `${displayName(message.speaker)}: ${message.text}`).join("\n");
}

export function updatePreviewMessagesFromScript(messages, scriptText, {
  allowCountChange = false,
  resolveSpeaker,
  formatTime
} = {}) {
  if (!Array.isArray(messages)) {
    throw new Error("The script edit target was invalid.");
  }
  const entries = String(scriptText || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^([^:：\n]{1,48})[:：]\s*(.+)$/u);
      if (!match) throw new Error("Each script line must use Speaker: message.");
      return { speakerLabel: match[1].trim(), text: match[2].trim() };
    });

  if (!entries.length || (!allowCountChange && entries.length !== messages.length)) {
    throw new Error("The script must keep one line for each message.");
  }

  return entries.map((entry, index) => {
    if (!entry.text) throw new Error("Message text cannot be blank.");
    const existing = messages[index] || {};
    return {
      ...existing,
      id: existing.id || `script-${index + 1}`,
      speaker: resolveSpeaker ? resolveSpeaker(entry.speakerLabel, index) : existing.speaker,
      text: entry.text,
      time: existing.time || (formatTime ? formatTime(index) : messages[messages.length - 1]?.time || "")
    };
  });
}
