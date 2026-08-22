export type SecurityAuditEvent = {
  eventType: string
  status: 'accepted' | 'error'
  provider?: string
  providerMessageId?: string
  stage?: string
  detail?: string
}

export async function writeSecurityAuditEvent(
  db: D1Database,
  event: SecurityAuditEvent,
): Promise<void> {
  await db.prepare(
    `INSERT INTO security_audit_logs
       (id, event_type, status, provider, provider_message_id, stage, detail)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    crypto.randomUUID(),
    event.eventType,
    event.status,
    event.provider ?? null,
    event.providerMessageId ?? null,
    event.stage ?? null,
    event.detail?.slice(0, 500) ?? null,
  ).run()
}
