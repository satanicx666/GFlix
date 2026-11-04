create policy "admins manage videos" on storage.objects for all to authenticated
  using (bucket_id = 'videos' and public.has_role(auth.uid(), 'admin'))
  with check (bucket_id = 'videos' and public.has_role(auth.uid(), 'admin'));

insert into public.server_config (name, base_url, is_active, priority, premium_only)
values ('Layar Storage', 'storage://videos', true, 10, false);