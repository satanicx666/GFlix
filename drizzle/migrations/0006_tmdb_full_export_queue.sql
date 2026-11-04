ALTER TABLE public.catalog_sync_jobs ADD COLUMN IF NOT EXISTS export_date date, ADD COLUMN IF NOT EXISTS export_offset bigint NOT NULL DEFAULT 0;
CREATE TABLE public.catalog_sync_queue (
 media_type text NOT NULL CHECK(media_type IN ('movie','tv')),
 tmdb_id bigint NOT NULL,
 synced_at timestamptz,
 attempts integer NOT NULL DEFAULT 0,
 PRIMARY KEY(media_type,tmdb_id)
);
GRANT ALL ON public.catalog_sync_queue TO service_role;
ALTER TABLE public.catalog_sync_queue ENABLE ROW LEVEL SECURITY;
CREATE INDEX catalog_sync_queue_pending_idx ON public.catalog_sync_queue(media_type, attempts, tmdb_id) WHERE synced_at IS NULL;
COMMENT ON COLUMN public.catalog_sync_jobs.start_date IS 'Reserved for future filtered imports; full import uses official daily ID exports';
COMMENT ON COLUMN public.catalog_sync_jobs.end_date IS 'Reserved for future filtered imports; full import uses official daily ID exports';