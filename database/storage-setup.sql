-- =====================================================
-- STORAGE SETUP FOR PROFILE PICTURES
-- =====================================================

-- 1. Criar bucket para fotos de perfil (se não existir)
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
-- IMPORTANTE: Substitua 'your-project-id' pelo ID real do seu projeto Supabase
CREATE OR REPLACE FUNCTION get_profile_picture_url(user_id UUID)
RETURNS TEXT AS $
BEGIN
  RETURN 'https://your-project-id.supabase.co/storage/v1/object/public/profile-pictures/' || user_id || '/profile.jpg';
END;
$ LANGUAGE plpgsql;

-- 4. Função para limpar foto antiga
CREATE OR REPLACE FUNCTION cleanup_old_profile_picture()
RETURNS TRIGGER AS $
BEGIN
  -- Remove qualquer imagem do usuário no bucket que não seja a atual
  DELETE FROM storage.objects 
  WHERE bucket_id = 'profile-pictures'
    AND name LIKE NEW.id::text || '/%'
    AND name != regexp_replace(NEW.profile_image, '^.*/profile-pictures/', '');

  RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- 5. Trigger na tabela users (corrigido para usar o nome correto da coluna)
DROP TRIGGER IF EXISTS cleanup_profile_picture_trigger ON public.users;

CREATE TRIGGER cleanup_profile_picture_trigger
AFTER UPDATE OF profile_image ON public.users
FOR EACH ROW
WHEN (OLD.profile_image IS DISTINCT FROM NEW.profile_image)
EXECUTE FUNCTION cleanup_old_profile_picture();

-- =====================================================
-- INSTRUÇÕES DE USO
-- =====================================================

-- Para usar este setup:
-- 1. Execute este SQL no Supabase SQL Editor
-- 2. Substitua 'your-project-id' na função get_profile_picture_url pelo ID real do seu projeto
-- 3. No frontend, faça upload das imagens para: profile-pictures/{user_id}/profile.jpg
-- 4. Salve a URL completa no campo profile_image da tabela users

-- Exemplo de URL final:
-- https://seu-project-id.supabase.co/storage/v1/object/public/profile-pictures/uuid-do-usuario/profile.jpg