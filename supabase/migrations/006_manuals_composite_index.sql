-- 006: Composite index for fast user manual lookups ordered by created_at
CREATE INDEX IF NOT EXISTS idx_manuals_user_id_created_at ON manuals(user_id, created_at DESC);
