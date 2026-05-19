-- =====================================================================
-- Trainzy — exercise-images storage bucket (Phase 3C)
-- =====================================================================
-- Public read, service-role write. Image Annotation exercise uses this
-- bucket to host the background image for each exercise.
--
-- Server-side uploads go through the admin client (service role) so we
-- don't need authenticated-write policies on storage.objects.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exercise-images',
  'exercise-images',
  true,
  5 * 1024 * 1024, -- 5MB
  array['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- Public read so the participant player can load <img src="..." /> without auth.
drop policy if exists "exercise-images public read" on storage.objects;
create policy "exercise-images public read"
  on storage.objects for select
  using (bucket_id = 'exercise-images');
