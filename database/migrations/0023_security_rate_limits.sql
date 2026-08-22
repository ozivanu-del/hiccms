-- Shared fixed-window counters for authentication and quota-sensitive actions.
CREATE TABLE IF NOT EXISTS security_rate_limits (
  scope TEXT NOT NULL,
  identifier_hash TEXT NOT NULL,
  window_started_at TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (scope, identifier_hash, window_started_at)
);

CREATE INDEX IF NOT EXISTS idx_security_rate_limits_cleanup
  ON security_rate_limits(window_started_at);
