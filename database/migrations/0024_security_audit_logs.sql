-- Security events are isolated from application logs and never store raw
-- credentials, reset tokens, email addresses, IP addresses, or API keys.
CREATE TABLE IF NOT EXISTS security_audit_logs (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('accepted', 'error')),
  provider TEXT,
  provider_message_id TEXT,
  stage TEXT,
  detail TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_security_audit_logs_event
  ON security_audit_logs(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_audit_logs_created
  ON security_audit_logs(created_at DESC);
