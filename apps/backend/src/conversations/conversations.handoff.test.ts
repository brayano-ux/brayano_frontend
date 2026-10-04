import { beforeEach, describe, expect, it, vi } from "vitest";

const { updateManyAndReturn } = vi.hoisted(() => ({ updateManyAndReturn: vi.fn() }));

vi.mock("../database/client.js", () => ({
  prisma: { conversation: { updateManyAndReturn } },
}));

import { updateConversationQualification } from "./conversations.service.js";

const update = {
  qualificationStatus: "QUALIFYING" as const,
  leadScore: 35,
  leadData: { need: "chaussures" },
  status: "OPEN" as const,
  aiEnabled: true,
};

describe("AI conversation updates during human handoff", () => {
  beforeEach(() => {
    updateManyAndReturn.mockReset();
  });

  it("only updates a conversation that is still open and AI-enabled", async () => {
    updateManyAndReturn.mockResolvedValueOnce([{ id: "conversation-1", updatedAt: new Date() }]);

    await updateConversationQualification("conversation-1", update);

    expect(updateManyAndReturn).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "conversation-1", status: "OPEN", aiEnabled: true },
    }));
  });

  it("reports that the AI result lost the race to a human takeover", async () => {
    updateManyAndReturn.mockResolvedValueOnce([]);

    await expect(updateConversationQualification("conversation-1", update)).resolves.toBeNull();
  });
});
