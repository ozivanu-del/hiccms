ALTER TABLE plugins ADD COLUMN approved_capabilities_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE plugins ADD COLUMN config_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE plugins ADD COLUMN compatibility_status TEXT NOT NULL DEFAULT 'compatible' CHECK (compatibility_status IN ('compatible', 'incompatible'));

CREATE TABLE IF NOT EXISTS plugin_audit_logs (
  id TEXT PRIMARY KEY,
  plugin_id TEXT,
  plugin_slug TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id TEXT,
  details_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_plugin_audit_slug_created ON plugin_audit_logs(plugin_slug, created_at DESC);

INSERT INTO plugin_audit_logs (id, plugin_id, plugin_slug, action, actor_id, created_at)
SELECT event.id, event.plugin_id, plugin.slug, event.action, event.actor_id, event.created_at
FROM plugin_lifecycle_events event
JOIN plugins plugin ON plugin.id = event.plugin_id
WHERE NOT EXISTS (SELECT 1 FROM plugin_audit_logs audit WHERE audit.id = event.id);
