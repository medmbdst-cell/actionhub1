-- ============================================================
-- Script de test : Créer un tenant et un admin
-- CORRIGÉ : Utilise le trigger handle_new_user() automatiquement
-- ============================================================

-- Étape 1: Nettoyer si déjà exécuté
DELETE FROM public.profiles WHERE email = 'admin@acme-corp.com';
DELETE FROM auth.users WHERE email = 'admin@acme-corp.com';
DELETE FROM public.tenants WHERE slug = 'acme-corp';

-- Étape 2: Créer le tenant et l'admin
DO $$
DECLARE
  new_tenant_id UUID := gen_random_uuid();
  new_user_id UUID := gen_random_uuid();
BEGIN
  -- 1. Créer le tenant
  INSERT INTO public.tenants (id, nom, slug, actif, created_at, updated_at)
  VALUES (
    new_tenant_id,
    'Acme Corporation',
    'acme-corp',
    true,
    NOW(),
    NOW()
  );

  -- 2. Créer l'utilisateur admin dans auth.users
  -- Le trigger handle_new_user() créera automatiquement le profil
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
    new_user_id,
    'authenticated',
    'authenticated',
    'admin@acme-corp.com',
    crypt('admin123', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object(
      'nom', 'Dupont',
      'prenom', 'Jean',
      'role', 'admin',
      'tenant_id', new_tenant_id::text
    ),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  );

  -- Le trigger a créé le profil automatiquement !
  RAISE NOTICE '✅ Tenant et admin créés avec succès !';
  RAISE NOTICE 'Tenant ID: %', new_tenant_id;
  RAISE NOTICE 'User ID: %', new_user_id;
  RAISE NOTICE 'Le trigger handle_new_user() a créé le profil automatiquement';
END $$;

-- Vérification
SELECT
  t.id as tenant_id,
  t.nom as tenant_nom,
  t.slug,
  p.id as admin_id,
  p.email,
  p.role,
  p.tenant_id,
  p.prenom,
  p.nom,
  p.actif
FROM public.tenants t
LEFT JOIN public.profiles p ON p.tenant_id = t.id
WHERE t.slug = 'acme-corp';

-- ============================================================
-- ✅ Résultat attendu:
-- - 1 ligne avec:
--   - tenant_nom: "Acme Corporation"
--   - email: "admin@acme-corp.com"
--   - role: "admin"
--   - prenom: "Jean", nom: "Dupont"
--   - actif: true
--
-- 🔐 Identifiants de test:
-- Email: admin@acme-corp.com
-- Mot de passe: admin123
--
-- 🌐 URLs à tester:
-- - Super Admin: http://localhost:3000/super-admin
-- - Admin Tenant: http://localhost:3000/admin
-- ============================================================
