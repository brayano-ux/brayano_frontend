import { describe, expect, it } from "vitest";
import { withConversationSendLock } from "./conversation-send-lock.js";

describe("withConversationSendLock", () => {
  it("serializes outbound operations for the same conversation", async () => {
    const events: string[] = [];
    let releaseFirst!: () => void;
    let signalFirstStarted!: () => void;
    const firstStarted = new Promise<void>((resolve) => {
      signalFirstStarted = resolve;
    });
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = withConversationSendLock("conversation-1", async () => {
      events.push("first-start");
      signalFirstStarted();
      await firstGate;
      events.push("first-end");
    });
    await firstStarted;

    const second = withConversationSendLock("conversation-1", async () => {
      events.push("second-start");
    });
    await Promise.resolve();
    expect(events).toEqual(["first-start"]);

    releaseFirst();
    await Promise.all([first, second]);
    expect(events).toEqual(["first-start", "first-end", "second-start"]);
  });

  it("allows different conversations to send independently", async () => {
    const events: string[] = [];
    await Promise.all([
      withConversationSendLock("conversation-a", async () => { events.push("a"); }),
      withConversationSendLock("conversation-b", async () => { events.push("b"); }),
    ]);
    expect(events).toHaveLength(2);
  });
});
