-- =====================================================
-- PROFILE PICTURES STORAGE BUCKET SETUP
-- =====================================================
-- This file sets up the storage bucket for profile pictures
-- Run this in your Supabase SQL editor after creating the main schema

-- 1. Create bucket for profile pictures (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-pictures',
  'profile-pictures',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Políticas RLS para o bucket
-- Permitir leitura pública
CREATE POLICY "Public Access"
ON storage.objects
FOR SELECT
USING (bucket_id = 'profile-pictures');

-- Permitir upload apenas na pasta do próprio usuário
CREATE POLICY "Users can upload their own profile pictures"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'profile-pictures'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Permitir atualização apenas na própria pasta
CREATE POLICY "Users can update their own profile pictures"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'profile-pictures'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Permitir exclusão apenas na própria pasta
CREATE POLICY "Users can delete their own profile pictures"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'profile-pictures'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 3. Função para gerar a URL pública da foto
CREATE OR REPLACE FUNCTION get_profile_picture_url(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN 'https://your-project-id.supabase.co/storage/v1/object/public/profile-pictures/' || user_id || '/profile.jpg';
END;
$$;

-- 4. Função para limpar foto antiga
CREATE OR REPLACE FUNCTION cleanup_old_profile_picture()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Remove qualquer imagem do usuário no bucket que não seja a atual
  -- Evita usar set-returning functions no WHERE
  IF NEW.profile_image IS NOT NULL AND NEW.profile_image != OLD.profile_image THEN
    DELETE FROM storage.objects 
    WHERE bucket_id = 'profile-pictures'
      AND name LIKE NEW.id::text || '/%'
      AND name != substring(NEW.profile_image from '.*/profile-pictures/(.*)$');
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Trigger na tabela real
DROP TRIGGER IF EXISTS cleanup_profile_picture_trigger ON public.users;

CREATE TRIGGER cleanup_profile_picture_trigger
AFTER UPDATE OF profile_image ON public.users
FOR EACH ROW
WHEN (OLD.profile_image IS DISTINCT FROM NEW.profile_image)
EXECUTE FUNCTION cleanup_old_profile_picture();

-- =====================================================
-- NOTES
-- =====================================================
-- 1. Replace 'your-project-id' in the get_profile_picture_url function with your actual Supabase project ID
-- 2. Make sure to enable RLS on the storage.objects table if not already enabled
-- 3. The bucket allows up to 5MB files in JPEG, PNG, WebP, and GIF formats
-- 4. Users can only upload/update/delete files in their own folder (/{user_id}/*)
-- 5. All files are publicly readable