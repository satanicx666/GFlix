CREATE TABLE public.catalog_sync_jobs (
 id text PRIMARY KEY CHECK (id IN ('movie','tv')),
 enabled boolean NOT NULL DEFAULT true,
 start_date date NOT NULL DEFAULT '1870-01-01',
 end_date date NOT NULL DEFAULT '1870-12-31',
 page integer NOT NULL DEFAULT 1,
 import_complete boolean NOT NULL DEFAULT false,
 imported_count bigint NOT NULL DEFAULT 0,
 changes_page integer NOT NULL DEFAULT 1,
 changes_since date NOT NULL DEFAULT CURRENT_DATE,
 pending_ids bigint[] NOT NULL DEFAULT '{}',
 last_success_at timestamptz,
 last_error text,
 lock_until timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.catalog_sync_jobs TO authenticated;
GRANT ALL ON public.catalog_sync_jobs TO service_role;
ALTER TABLE public.catalog_sync_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read sync jobs" ON public.catalog_sync_jobs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS media_catalog_updated_idx ON public.media_catalog(updated_at);
CREATE OR REPLACE FUNCTION public.claim_catalog_sync_job(job_id text)
RETURNS SETOF public.catalog_sync_jobs LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
 UPDATE public.catalog_sync_jobs SET lock_until = now() + interval '45 seconds'
 WHERE id = job_id AND enabled AND (lock_until IS NULL OR lock_until < now()) RETURNING *;
$$;
REVOKE ALL ON FUNCTION public.claim_catalog_sync_job(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_catalog_sync_job(text) TO service_role;