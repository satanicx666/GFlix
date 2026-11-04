ALTER TABLE public.site_settings ADD COLUMN movie_embed_template text NOT NULL DEFAULT 'https://nxsha.space/embed/movie/{id}';
ALTER TABLE public.site_settings ADD COLUMN tv_embed_template text NOT NULL DEFAULT 'https://nxsha.space/embed/tv/{id}/{season}/{episode}';
COMMENT ON COLUMN public.site_settings.movie_embed_template IS 'Admin-confirmed authorized HTTPS movie embed template using {id}.';
COMMENT ON COLUMN public.site_settings.tv_embed_template IS 'Admin-confirmed authorized HTTPS TV embed template using {id}, {season}, {episode}.';