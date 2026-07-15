/**
 * Session limits — guards against resource exhaustion attacks.
 *
 * Addresses threats:
 *   T14 — runaway agent loop loading thousands of intentions into memory
 *
 * The MCP server holds intentions in a session-scoped Map. Without limits,
 * a malicious or runaway client could exhaust Node.js heap memory.
 */

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

/**
 * Maximum number of intentions that can be loaded in a single session.
 * Given that a typical engagement loads 1-3 intentions, 50 is generous
 * while still protecting against unbounded growth.
 */
export const MAX_INTENTIONS_PER_SESSION = 50;

/**
 * Maximum size of a single intention payload (in characters of JSON).
 * Protects against oversized payloads that could consume disproportionate memory.
 */
export const MAX_INTENTION_PAYLOAD_SIZE = 64 * 1024; // 64 KB

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export class SessionLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionLimitError";
  }
}

/**
 * Check whether a new intention can be loaded into the session.
 *
 * @param currentCount - Current number of intentions in the session map
 * @throws SessionLimitError if the limit would be exceeded
 */
export function checkIntentionLimit(currentCount: number): void {
  if (currentCount >= MAX_INTENTIONS_PER_SESSION) {
    throw new SessionLimitError(
      `Session intention limit reached (${MAX_INTENTIONS_PER_SESSION}). ` +
        `Each MCP session supports up to ${MAX_INTENTIONS_PER_SESSION} loaded intentions. ` +
        `Restart the session to clear the intention map.`,
    );
  }
}

/**
 * Validate the size of an intention payload before processing.
 *
 * @param payload - The raw intention input (will be JSON-stringified for size check)
 * @throws SessionLimitError if the payload exceeds the size limit
 */
export function checkIntentionPayloadSize(payload: unknown): void {
  const serialized = JSON.stringify(payload);
  if (serialized.length > MAX_INTENTION_PAYLOAD_SIZE) {
    throw new SessionLimitError(
      `Intention payload exceeds maximum size (${MAX_INTENTION_PAYLOAD_SIZE} bytes). ` +
        `Received ${serialized.length} bytes. Reduce the payload size.`,
    );
  }
}
