CREATE TABLE public.media_catalog (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tmdb_id integer NOT NULL,
 media_type text NOT NULL CHECK (media_type IN ('movie','tv')),
 title text NOT NULL,
 overview text NOT NULL DEFAULT '',
 poster_path text,
 backdrop_path text,
 vote_average numeric NOT NULL DEFAULT 0,
 release_date text,
 metadata jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (tmdb_id, media_type)
);
GRANT SELECT ON public.media_catalog TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.media_catalog TO authenticated;
GRANT ALL ON public.media_catalog TO service_role;
ALTER TABLE public.media_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public metadata read" ON public.media_catalog FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin catalog writes" ON public.media_catalog FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.media_catalog (tmdb_id, media_type, title)
SELECT DISTINCT ON (tmdb_id, media_type) tmdb_id, media_type, COALESCE(title, media_type || ' ' || tmdb_id::text) FROM public.licensed_videos ORDER BY tmdb_id, media_type, created_at DESC;
ALTER TABLE public.licensed_videos ADD COLUMN catalog_id uuid REFERENCES public.media_catalog(id);
ALTER TABLE public.licensed_videos ADD COLUMN source_type text NOT NULL DEFAULT 'video' CHECK (source_type IN ('video','embed'));
UPDATE public.licensed_videos v SET catalog_id = c.id FROM public.media_catalog c WHERE c.tmdb_id = v.tmdb_id AND c.media_type = v.media_type;
CREATE INDEX media_catalog_title_idx ON public.media_catalog(title);
CREATE INDEX licensed_videos_catalog_idx ON public.licensed_videos(catalog_id);