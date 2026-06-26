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
