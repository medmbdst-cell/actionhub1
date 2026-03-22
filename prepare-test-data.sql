-- Script de préparation des données de test pour dashboards responsable/collaborateur
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier et assigner l'équipe à Pierre Martin (responsable)
UPDATE profiles
SET equipe_id = (
  SELECT id FROM equipes WHERE nom = 'Equipe patrimoine' LIMIT 1
)
WHERE email = 'pierre.martin@acme-corp.com';

-- 2. Vérifier et assigner l'équipe à Jeanne Duponne (collaborateur)
UPDATE profiles
SET equipe_id = (
  SELECT id FROM equipes WHERE nom = 'Equipe patrimoine' LIMIT 1
)
WHERE email = 'Jeanne.duponne@gmail.com';

-- 3. Assigner 50 actions à l'équipe patrimoine (pour que Pierre les voie)
UPDATE actions
SET equipe_id = (SELECT id FROM equipes WHERE nom = 'Equipe patrimoine' LIMIT 1)
WHERE id IN (
  SELECT id FROM actions
  WHERE equipe_id IS NULL
  LIMIT 50
);

-- 4. Assigner 20 actions directement à Jeanne Duponne (ses actions personnelles)
UPDATE actions
SET responsable_id = (SELECT id FROM profiles WHERE email = 'Jeanne.duponne@gmail.com'),
    responsable_txt = 'Jeanne Duponne'
WHERE id IN (
  SELECT id FROM actions
  WHERE responsable_id IS NULL
  AND equipe_id = (SELECT id FROM equipes WHERE nom = 'Equipe patrimoine' LIMIT 1)
  LIMIT 20
);

-- 5. Vérification : afficher les profils mis à jour
SELECT
  email,
  nom,
  prenom,
  role,
  equipe_id,
  (SELECT nom FROM equipes WHERE id = profiles.equipe_id) as nom_equipe
FROM profiles
WHERE email IN ('pierre.martin@acme-corp.com', 'Jeanne.duponne@gmail.com');

-- 6. Vérification : compter les actions assignées
SELECT
  'Actions équipe patrimoine' as type,
  COUNT(*) as count
FROM actions
WHERE equipe_id = (SELECT id FROM equipes WHERE nom = 'Equipe patrimoine' LIMIT 1)

UNION ALL

SELECT
  'Actions de Jeanne' as type,
  COUNT(*) as count
FROM actions
WHERE responsable_id = (SELECT id FROM profiles WHERE email = 'Jeanne.duponne@gmail.com');
