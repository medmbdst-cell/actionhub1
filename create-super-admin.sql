-- Script SQL pour créer un super admin directement dans Supabase
-- À exécuter dans le SQL Editor de Supabase

-- 1. Créer l'utilisateur dans auth.users
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@actionhub.com',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"nom":"Admin","prenom":"Super","role":"super_admin"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
)
ON CONFLICT (email) DO NOTHING
RETURNING id;

-- 2. Créer le profil super admin
-- Note: Récupérez l'UUID retourné ci-dessus et remplacez-le dans la requête suivante
-- Ou utilisez cette version qui le fait automatiquement:

INSERT INTO public.profiles (
  id,
  tenant_id,
  role,
  nom,
  prenom,
  email,
  actif
)
SELECT
  u.id,
  NULL,
  'super_admin'::user_role,
  'Admin',
  'Super',
  'admin@actionhub.com',
  true
FROM auth.users u
WHERE u.email = 'admin@actionhub.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'super_admin',
  tenant_id = NULL,
  actif = true;

-- 3. Vérification
SELECT
  p.id,
  p.email,
  p.role,
  p.tenant_id,
  p.nom,
  p.prenom,
  p.actif
FROM public.profiles p
WHERE p.email = 'admin@actionhub.com';
