const conversationLocks = new Map<string, Promise<void>>();

export async function withConversationSendLock<T>(conversationId: string, operation: () => Promise<T>): Promise<T> {
  const previous = conversationLocks.get(conversationId) ?? Promise.resolve();
  let releaseCurrent!: () => void;
  const currentGate = new Promise<void>((resolve) => {
    releaseCurrent = resolve;
  });
  const currentTail = previous.then(() => currentGate);
  conversationLocks.set(conversationId, currentTail);

  await previous;
  try {
    return await operation();
  } finally {
    releaseCurrent();
    if (conversationLocks.get(conversationId) === currentTail) {
      conversationLocks.delete(conversationId);
    }
  }
}
