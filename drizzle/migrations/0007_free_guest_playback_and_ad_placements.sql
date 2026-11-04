GRANT SELECT ON public.server_config, public.licensed_videos TO anon;
ALTER POLICY "members read servers" ON public.server_config TO anon, authenticated USING (is_active OR public.has_role(auth.uid(), 'admin'));
ALTER POLICY "members read allowed videos" ON public.licensed_videos TO anon, authenticated USING (public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.server_config s WHERE s.id = server_id AND s.is_active));
COMMENT ON COLUMN public.profiles.premium_until IS 'DEPRECATED: premium removed; viewing is free';
COMMENT ON COLUMN public.profiles.membership_tier IS 'DEPRECATED: premium removed; viewing is free';
COMMENT ON COLUMN public.server_config.premium_only IS 'DEPRECATED: all active servers are available without premium';
COMMENT ON TABLE public.payments IS 'DEPRECATED: premium passes removed; retained for historical records';
COMMENT ON FUNCTION public.is_premium(uuid) IS 'DEPRECATED: no longer used to gate playback';
CREATE TABLE public.advertisements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
 headline text NOT NULL DEFAULT '' CHECK (char_length(headline) <= 160),
 image_url text CHECK (image_url IS NULL OR image_url LIKE 'https://%'),
 target_url text CHECK (target_url IS NULL OR target_url LIKE 'https://%'),
 placement text NOT NULL CHECK (placement IN ('home','details','watch_top','watch_bottom','preroll','footer')),
 is_active boolean NOT NULL DEFAULT false,
 sort_order integer NOT NULL DEFAULT 0,
 duration_seconds integer NOT NULL DEFAULT 5 CHECK (duration_seconds BETWEEN 1 AND 30),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.advertisements TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.advertisements TO authenticated;
GRANT ALL ON public.advertisements TO service_role;
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public active advertisements" ON public.advertisements FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY "admin manage advertisements" ON public.advertisements FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX advertisements_placement_idx ON public.advertisements (placement, sort_order) WHERE is_active;