/**
 * Audit logging — structured logging of MCP tool invocations.
 *
 * Addresses architectural gap:
 *   No audit logging of tool calls, file writes, or asset installations.
 *
 * Emits structured JSON log lines to stderr (the standard MCP sideband
 * for server diagnostics). This does NOT interfere with stdio transport
 * which uses stdout for protocol messages.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface AuditEntry {
  /** ISO-8601 timestamp */
  ts: string;
  /** Tool name that was invoked */
  tool: string;
  /** Outcome: success or error */
  outcome: "success" | "error";
  /** Duration in milliseconds */
  durationMs: number;
  /** Key parameters (sanitized — no secrets) */
  params?: Record<string, unknown>;
  /** Error message if outcome is "error" */
  error?: string;
  /** Request correlation ID */
  requestId?: string;
}

/* ------------------------------------------------------------------ */
/*  Logger                                                             */
/* ------------------------------------------------------------------ */

/**
 * Whether audit logging is enabled. Controlled by the FDE_AUDIT_LOG
 * environment variable. Defaults to enabled.
 */
const AUDIT_ENABLED = process.env.FDE_AUDIT_LOG !== "false";

/**
 * Emit a structured audit log entry to stderr.
 * Safe to call in all environments — silently no-ops when disabled.
 */
export function auditLog(entry: AuditEntry): void {
  if (!AUDIT_ENABLED) return;
  try {
    const line = JSON.stringify({ level: "audit", ...entry });
    process.stderr.write(line + "\n");
  } catch {
    // Never let audit logging crash the server
  }
}

/**
 * Sanitize parameters for audit logging — removes potentially sensitive
 * values and truncates long strings.
 */
export function sanitizeParams(params: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    // Skip potentially sensitive fields
    if (key.toLowerCase().includes("token") || key.toLowerCase().includes("secret")) {
      sanitized[key] = "[REDACTED]";
      continue;
    }
    if (typeof value === "string" && value.length > 200) {
      sanitized[key] = value.slice(0, 200) + "...[truncated]";
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
