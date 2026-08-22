import type { WorkerBindings } from '../env'

export async function runScheduledMaintenance(env: WorkerBindings): Promise<void> {
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE posts SET status = 'published', updated_at = CURRENT_TIMESTAMP WHERE status = 'scheduled' AND datetime(published_at) <= CURRENT_TIMESTAMP",
    ),
    env.DB.prepare(
      "DELETE FROM security_rate_limits WHERE window_started_at < datetime('now', '-2 days')",
    ),
  ])
}
