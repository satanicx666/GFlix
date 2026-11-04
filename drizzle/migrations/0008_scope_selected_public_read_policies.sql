ALTER TABLE public.media_catalog ADD COLUMN is_published boolean NOT NULL DEFAULT true;
COMMENT ON COLUMN public.media_catalog.is_published IS 'Only published movie and TV metadata is visible publicly; administrators can read unpublished rows.';
ALTER POLICY "Public metadata read" ON public.media_catalog USING (is_published = true);
ALTER POLICY "public read settings" ON public.site_settings USING (id = 1);
CREATE POLICY "admin read all settings" ON public.site_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
ALTER POLICY "members read parties" ON public.watch_parties USING (host_id = auth.uid());
CREATE FUNCTION public.get_watch_party_by_code(p_code text)
RETURNS SETOF public.watch_parties
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_code IS NULL OR p_code !~ '^([A-Z0-9]{6}|[A-F0-9]{32})$' THEN
    RETURN;
  END IF;
  RETURN QUERY SELECT p.* FROM public.watch_parties AS p WHERE p.code = p_code LIMIT 1;
END;
$$;
REVOKE ALL ON FUNCTION public.get_watch_party_by_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_watch_party_by_code(text) TO authenticated;
COMMENT ON FUNCTION public.get_watch_party_by_code(text) IS 'Authenticated invite lookup of one exact room code only; does not allow room enumeration.';