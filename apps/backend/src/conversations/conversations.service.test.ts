import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { isConversationUpdateCurrent, selectActiveConversation, shouldReactivateAiAfterHandoff } from "./conversations.service.js";

describe("shouldReactivateAiAfterHandoff", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-10T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reactivates the AI after 24 hours from a human handoff", () => {
    const staleDate = new Date("2026-01-09T11:00:00.000Z");

    expect(shouldReactivateAiAfterHandoff(staleDate)).toBe(true);
  });

  it("does not reactivate before 24 hours have passed", () => {
    const recentDate = new Date("2026-01-09T13:30:00.000Z");

    expect(shouldReactivateAiAfterHandoff(recentDate)).toBe(false);
  });

  it("keeps the cooldown active until the exact 24-hour boundary", () => {
    const handoffAt = new Date("2026-01-09T12:00:00.000Z");
    expect(shouldReactivateAiAfterHandoff(handoffAt)).toBe(true);
    expect(shouldReactivateAiAfterHandoff(new Date(handoffAt.getTime() + 1))).toBe(false);
  });
});

describe("isConversationUpdateCurrent", () => {
  it("detects a conversation changed after the AI prepared a response", () => {
    const aiUpdatedAt = new Date("2026-01-10T12:00:00.000Z");
    expect(isConversationUpdateCurrent(aiUpdatedAt, aiUpdatedAt)).toBe(true);
    expect(isConversationUpdateCurrent(new Date(aiUpdatedAt.getTime() + 1), aiUpdatedAt)).toBe(false);
  });
});

describe("selectActiveConversation", () => {
  it("keeps the handoff thread even if a newer OPEN duplicate exists", () => {
    const selected = selectActiveConversation([
      { id: "open-duplicate", status: "OPEN" as const },
      { id: "handoff", status: "HUMAN_HANDOFF" as const },
    ]);

    expect(selected?.id).toBe("handoff");
  });

  it("reuses an OPEN conversation when there is no handoff", () => {
    const selected = selectActiveConversation([{ id: "open", status: "OPEN" as const }]);

    expect(selected?.id).toBe("open");
  });
});
