export function createId(prefix: string) {
  const cryptoRef = globalThis as { crypto?: { randomUUID?: () => string } };
  if (typeof cryptoRef.crypto?.randomUUID === 'function') {
    return `${prefix}-${cryptoRef.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}
