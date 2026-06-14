/**
 * Returns a v4-style UUID.
 * Uses crypto.randomUUID() when available (secure contexts: HTTPS / localhost).
 * Falls back to a Math.random()-based implementation for non-secure contexts
 * (e.g. accessing the dev server over a local network IP).
 */
export function generateId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID()
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
